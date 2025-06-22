import os
from flask import Flask, request, jsonify, send_file
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
from flask_cors import CORS
from datetime import datetime, timedelta, timezone
import requests
import time
from collections import defaultdict, Counter
import re
import base64
import google.generativeai as genai
import gridfs
import io
import binascii
import json

load_dotenv()

app = Flask(__name__)

# Configure CORS - Most permissive for development
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.getenv("NEXT_PUBLIC_API_URL"),
    "http://justgitajoblol.compare"
]
CORS(
    app,
    origins=[o for o in origins if o],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    supports_credentials=True,
    expose_headers=["*"]
)

# Alternative CORS configuration
app.config['CORS_HEADERS'] = 'Content-Type'
# Create MongoDB connection
mongo_uri = os.getenv("MONGODB_URI")
if not mongo_uri:
    raise Exception("MONGODB_URI environment variable not set")

client = MongoClient(mongo_uri)
db = client.get_database("git-hired")
candidates_collection = db.get_collection("candidates")
fs = gridfs.GridFS(db)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)  # type: ignore


GITHUB_API_URL = "https://api.github.com"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {'Authorization': f'token {GITHUB_TOKEN}'}
TOPIC_HEADER = {
    **HEADERS,
    "Accept": "application/vnd.github.mercy-preview+json"
}
def parse_github_datetime(date_string):
    """Safely parse GitHub datetime strings"""
    if not date_string or not isinstance(date_string, str):
        return None
    
    try:
        if date_string.endswith('Z'):
            date_string = date_string.replace('Z', '+00:00')
        return datetime.fromisoformat(date_string)
    except Exception as e:
        print(f"DateTime parsing error for '{date_string}': {e}")
        return None
    

@app.post("/find-matching-users")
def find_matching_users():
    data = request.get_json()
    required_skills = [skill.lower() for skill in data.get("required_skills", [])]
    languages = data.get("languages", [])
    min_followers = data.get("min_followers", 0)
    min_stars = data.get("min_stars", 0)

    matched_usernames = set()

    for lang in languages:
        skill_query = "+".join(required_skills) if required_skills else ""
        query = f"{skill_query}+language:{lang}+stars:>={min_stars}"
        url = f"{GITHUB_API_URL}/search/repositories?q={query}&sort=stars&order=desc&per_page=50"

        try:
            response = requests.get(url, headers=HEADERS)
            response.raise_for_status()
            repos = response.json().get("items", [])

            for repo in repos:
                username = repo["owner"]["login"]
                if username in matched_usernames:
                    continue

                user_data = requests.get(repo["owner"]["url"], headers=HEADERS).json()
                if user_data.get("type") != "User":
                    continue
                if user_data.get("followers", 0) < min_followers:
                    continue

                # Check skill match in name/description (case insensitive)
                text = f"{repo.get('name', '')} {repo.get('description', '')}".lower()
                if any(skill in text for skill in required_skills):
                    matched_usernames.add(username)

        except Exception as e:
            print(f"Error processing {lang}: {e}")

    return jsonify({"matched_username": list(matched_usernames)})

@app.get("/get-info/<string:username>")
def getInfo(username):
    try:
        user_url = f"{GITHUB_API_URL}/users/{username}"
        user_resp = requests.get(user_url, headers=HEADERS).json()

        if "message" in user_resp:
            return jsonify({"error": "User not found"}), 404

        repos_url = f"{user_url}/repos?per_page=100"
        repos = requests.get(repos_url, headers=HEADERS).json()

        if not isinstance(repos, list):
            return jsonify({"error": "Failed to fetch repositories"}), 500

        language_usage = {}
        total_stars = 0
        total_commits = 0
        all_topics = set()

        for repo in repos:
            # Language count
            lang = repo.get("language")
            if lang:
                language_usage[lang] = language_usage.get(lang, 0) + 1

            # Star count
            total_stars += repo.get("stargazers_count", 0)

            # Fetch topics
            topics_url = f"{repo['url']}/topics"
            topics_resp = requests.get(topics_url, headers=TOPIC_HEADER).json()
            topics = topics_resp.get("names", [])
            all_topics.update(topics)

            # Commit count per repo (limited for speed)
            commits_url = repo["commits_url"].replace("{/sha}", "")
            commit_resp = requests.get(commits_url, headers=HEADERS).json()
            if isinstance(commit_resp, list):
                total_commits += len(commit_resp)

        return jsonify({
            "username": username,
            "followers": user_resp.get("followers", 0),
            "public_repos": user_resp.get("public_repos", 0),
            "top_languages": sorted(language_usage, key=language_usage.get, reverse=True),
            "total_stars": total_stars,
            "average_stars_per_repo": round(total_stars / len(repos), 2) if repos else 0,
            "total_commit_samples": total_commits,
            "inferred_skills_from_topics": list(all_topics)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
# Enhanced skill detection patterns with more comprehensive coverage
SKILL_PATTERNS = {
    'frontend': [
        'react', 'vue', 'angular', 'svelte', 'frontend', 'front-end', 'html', 'css', 'javascript', 'typescript', 
        'sass', 'scss', 'less', 'next.js', 'nuxt', 'gatsby', 'webpack', 'vite', 'tailwind', 'bootstrap', 
        'material-ui', 'mui', 'chakra', 'styled-components', 'emotion', 'redux', 'mobx', 'zustand', 
        'jquery', 'backbone', 'ember', 'knockout', 'polymer', 'lit', 'stencil', 'alpine.js'
    ],
    'backend': [
        'django', 'flask', 'fastapi', 'express', 'koa', 'hapi', 'nestjs', 'spring', 'spring-boot', 
        'backend', 'back-end', 'api', 'server', 'node.js', 'nodejs', 'laravel', 'symfony', 'codeigniter', 
        'rails', 'ruby-on-rails', 'sinatra', 'asp.net', 'dotnet', '.net', 'core', 'mvc', 'web-api',
        'go', 'gin', 'echo', 'fiber', 'rust', 'actix', 'rocket', 'warp', 'axum', 'php', 'slim'
    ],
    'mobile': [
        'android', 'ios', 'react-native', 'flutter', 'swift', 'kotlin', 'mobile', 'xamarin', 
        'ionic', 'cordova', 'phonegap', 'expo', 'nativescript', 'unity', 'unreal', 'java-android',
        'objective-c', 'swiftui', 'jetpack-compose', 'flutter-dart', 'capacitor'
    ],
    'ml': [
        'machine-learning', 'ml', 'tensorflow', 'pytorch', 'sklearn', 'scikit-learn', 'ai', 'artificial-intelligence',
        'neural', 'deep-learning', 'data-science', 'pandas', 'numpy', 'matplotlib', 'seaborn', 'plotly',
        'jupyter', 'notebook', 'keras', 'opencv', 'computer-vision', 'nlp', 'natural-language-processing',
        'transformers', 'bert', 'gpt', 'llm', 'langchain', 'huggingface', 'xgboost', 'lightgbm', 'catboost'
    ],
    'devops': [
        'docker', 'kubernetes', 'k8s', 'aws', 'amazon-web-services', 'gcp', 'google-cloud', 'azure', 
        'microsoft-azure', 'terraform', 'ansible', 'jenkins', 'ci/cd', 'github-actions', 'gitlab-ci',
        'circle-ci', 'travis-ci', 'helm', 'istio', 'prometheus', 'grafana', 'elk', 'elasticsearch',
        'logstash', 'kibana', 'nginx', 'apache', 'load-balancer', 'microservices', 'serverless'
    ],
    'database': [
        'mongodb', 'postgresql', 'postgres', 'mysql', 'sqlite', 'redis', 'elasticsearch', 'database', 
        'sql', 'nosql', 'cassandra', 'dynamodb', 'firebase', 'firestore', 'supabase', 'planetscale',
        'prisma', 'typeorm', 'sequelize', 'mongoose', 'knex', 'drizzle', 'clickhouse', 'snowflake'
    ],
    'testing': [
        'jest', 'mocha', 'chai', 'cypress', 'selenium', 'playwright', 'puppeteer', 'testing', 'unit-test',
        'integration-test', 'e2e', 'tdd', 'bdd', 'pytest', 'unittest', 'rspec', 'jasmine', 'karma'
    ],
    'tools': [
        'git', 'github', 'gitlab', 'bitbucket', 'vscode', 'intellij', 'vim', 'emacs', 'sublime',
        'postman', 'insomnia', 'figma', 'sketch', 'adobe', 'photoshop', 'illustrator'
    ]
}

def extract_skills_from_text(text):
    """Enhanced skill extraction with better pattern matching"""
    if not text:
        return []
    
    text_lower = text.lower()
    found_skills = []
    
    # Direct keyword matching
    for category, keywords in SKILL_PATTERNS.items():
        for keyword in keywords:
            if keyword in text_lower:
                found_skills.append(keyword)
    
    # Additional pattern matching for common variations
    # Framework patterns
    framework_patterns = [
        r'\b(react|vue|angular|svelte)\b',
        r'\b(django|flask|fastapi|express)\b', 
        r'\b(tensorflow|pytorch|keras)\b',
        r'\b(docker|kubernetes|k8s)\b',
        r'\b(mongodb|postgresql|mysql|redis)\b'
    ]
    
    for pattern in framework_patterns:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        found_skills.extend(matches)
    
    # Remove duplicates and return
    return list(set(found_skills))

def extract_skills_from_repo_structure(repo_data, readme_content):
    """Extract skills from repository structure, files, and content"""
    skills = []
    
    # Analyze repository name and description
    repo_text = f"{repo_data.get('name', '')} {repo_data.get('description', '')}"
    skills.extend(extract_skills_from_text(repo_text))
    
    # Analyze README content
    if readme_content:
        skills.extend(extract_skills_from_text(readme_content))
    
    # Analyze topics
    topics = repo_data.get('topics', [])
    for topic in topics:
        skills.extend(extract_skills_from_text(topic))
    
    # Language-based skill inference
    language = repo_data.get('language')
    if language:
        language_skills = {
            'JavaScript': ['javascript', 'frontend', 'web'],
            'TypeScript': ['typescript', 'javascript', 'frontend', 'web'],
            'Python': ['python', 'backend', 'data-science'],
            'Java': ['java', 'backend', 'android'],
            'Swift': ['swift', 'ios', 'mobile'],
            'Kotlin': ['kotlin', 'android', 'mobile'],
            'Go': ['go', 'backend', 'microservices'],
            'Rust': ['rust', 'backend', 'systems'],
            'C++': ['cpp', 'systems', 'game-development'],
            'C#': ['csharp', 'dotnet', 'backend'],
            'PHP': ['php', 'backend', 'web'],
            'Ruby': ['ruby', 'backend', 'rails'],
            'Dart': ['dart', 'flutter', 'mobile'],
            'HTML': ['html', 'frontend', 'web'],
            'CSS': ['css', 'frontend', 'styling'],
            'Jupyter Notebook': ['jupyter', 'data-science', 'python', 'ml']
        }
        
        if language in language_skills:
            skills.extend(language_skills[language])
    
    return list(set(skills))

def get_repo_readme(username, repo_name):
    """Get README content from repository"""
    readme_files = ['README.md', 'README.rst', 'README.txt', 'README']
    
    for readme_name in readme_files:
        try:
            readme_url = f"{GITHUB_API_URL}/repos/{username}/{repo_name}/contents/{readme_name}"
            readme_resp = requests.get(readme_url, headers=HEADERS)
            
            if readme_resp.status_code == 200:
                readme_data = readme_resp.json()
                if readme_data.get('content'):
                    content = base64.b64decode(readme_data['content']).decode('utf-8', errors='ignore')
                    return content
        except:
            continue
    
    return ""

def get_commit_count_paginated(username, repo_name):
    """Get accurate commit count with pagination"""
    try:
        commits_url = f"{GITHUB_API_URL}/repos/{username}/{repo_name}/commits?author={username}&per_page=1"
        response = requests.head(commits_url, headers=HEADERS)
        
        if response.status_code != 200:
            return 0
        
        # Parse Link header for pagination
        link_header = response.headers.get('Link', '')
        if 'rel="last"' in link_header:
            last_page_match = re.search(r'page=(\d+)>; rel="last"', link_header)
            if last_page_match:
                return int(last_page_match.group(1))
        
        # If no pagination, get actual count
        commits_resp = requests.get(f"{GITHUB_API_URL}/repos/{username}/{repo_name}/commits?author={username}&per_page=100", headers=HEADERS)
        if commits_resp.status_code == 200:
            commits_data = commits_resp.json()
            return len(commits_data) if isinstance(commits_data, list) else 0
            
    except Exception as e:
        print(f"Error getting commit count for {repo_name}: {e}")
    
    return 0

def make_serializable(doc):
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
        doc["createdAt"] = doc["createdAt"].isoformat()
    # Recursively check for nested objects
    for key, value in doc.items():
        if isinstance(value, list):
            doc[key] = [make_serializable(v) if isinstance(v, dict) else v for v in value]
        elif isinstance(value, dict):
            doc[key] = make_serializable(value)
    return doc

#--------------------------------- API Routes ---------------------------------
@app.get("/email/<string:username>")
def getEmail(username):
    try:
        repos_url = f"https://api.github.com/users/{username}/repos"
        repos = requests.get(repos_url, headers=HEADERS).json()

        if isinstance(repos, dict) and repos.get('message'):
            return jsonify({"email": None}), 404

        if not repos:
            return jsonify({"email": None}), 404

        repo_name = repos[0]['name']
        commits_url = f"https://api.github.com/repos/{username}/{repo_name}/commits"
        commits = requests.get(commits_url, headers=HEADERS).json()

        for commit in commits:
            email= commit['commit']['author']['email']
            if email:
                return jsonify({"email":email})
        
        return jsonify({"email": None}), 404
            
    except Exception as e:
        return jsonify({"message": str(e)}), 500



@app.get("/deep-search/<string:username>")
def deep_search(username):
    """
    Deep GitHub profile analysis with comprehensive metrics
    
    Returns:
    - Language & repo distribution (for pie charts)
    - Commit & activity metrics
    - Popularity and reach metrics
    - Skill inference from topics, READMEs, descriptions
    - Social & community contribution indicators
    """
    try:
        print(f"Starting deep analysis for {username}")
        start_time = time.time()
        
        # Get user data
        user_url = f"{GITHUB_API_URL}/users/{username}"
        user_resp = requests.get(user_url, headers=HEADERS)
        
        if user_resp.status_code != 200:
            return jsonify({"error": "User not found"}), 404
            
        user_data = user_resp.json()
        
        # Get all repositories with pagination
        all_repos = []
        page = 1
        while True:
            repos_url = f"{user_url}/repos?per_page=100&page={page}&type=all&sort=updated"
            repos_resp = requests.get(repos_url, headers=HEADERS)
            
            if repos_resp.status_code != 200:
                break
                
            repos_batch = repos_resp.json()
            if not repos_batch:
                break
                
            all_repos.extend(repos_batch)
            
            if len(repos_batch) < 100:
                break
                
            page += 1
            time.sleep(0.1)  # Rate limiting
        
        if not all_repos:
            return jsonify({"error": "No repositories found"}), 404
        
        print(f"Found {len(all_repos)} repositories")
        
        # Initialize analysis containers
        analysis = {
            "user_info": {
                "username": username,
                "name": user_data.get("name"),
                "bio": user_data.get("bio"),
                "company": user_data.get("company"),
                "location": user_data.get("location"),
                "followers": user_data.get("followers", 0),
                "following": user_data.get("following", 0),
                "public_repos": user_data.get("public_repos", 0),
                "public_gists": user_data.get("public_gists", 0),
                "created_at": user_data.get("created_at"),
                "blog": user_data.get("blog"),
                "twitter_username": user_data.get("twitter_username")
            },
            "language_distribution": defaultdict(int),
            "stars_per_language": defaultdict(int),
            "commits_per_language": defaultdict(int),
            "top_repo_per_language": defaultdict(lambda: {"name": "", "stars": 0, "url": ""}),
            "repo_details": [],
            "activity_metrics": {
                "total_commits": 0,
                "active_repos_count": 0,
                "last_activity_date": None,
                "repos_with_recent_activity": 0,
                "avg_commits_per_repo": 0
            },
            "popularity_metrics": {
                "total_stars": 0,
                "total_forks": 0,
                "total_watchers": 0,
                "avg_stars_per_repo": 0,
                "most_starred_repo": {"name": "", "stars": 0, "description": "", "url": ""},
                "repos_with_stars": 0
            },
            "skills_analysis": {
                "topics_used": Counter(),
                "readme_keywords": Counter(),
                "description_keywords": Counter(),
                "all_inferred_skills": Counter(),
                "skill_categories": defaultdict(int)
            }
        }
        
        # Process repositories
        for i, repo in enumerate(all_repos):
            if i % 20 == 0:
                print(f"Processing repo {i+1}/{len(all_repos)}")
            
            repo_name = repo["name"]
            language = repo.get("language")
            stars = repo.get("stargazers_count", 0)
            forks = repo.get("forks_count", 0)
            watchers = repo.get("watchers_count", 0)
            description = repo.get("description", "") or ""
            updated_at = repo.get("updated_at")
            repo_url = repo.get("html_url", "")
            
            # Language distribution
            if language:
                analysis["language_distribution"][language] += 1
                analysis["stars_per_language"][language] += stars
                
                # Track top repo per language
                if stars > analysis["top_repo_per_language"][language]["stars"]:
                    analysis["top_repo_per_language"][language] = {
                        "name": repo_name,
                        "stars": stars,
                        "url": repo_url
                    }
            
            # Get topics
            topics = []
            try:
                topics_url = f"{repo['url']}/topics"
                topics_resp = requests.get(topics_url, headers=TOPIC_HEADER)
                if topics_resp.status_code == 200:
                    topics = topics_resp.json().get("names", [])
                    analysis["skills_analysis"]["topics_used"].update(topics)
                time.sleep(0.05)  # Rate limiting
            except:
                pass
            
            # Get commit count (for starred repos or first 30)
            commits = 0
            if stars > 0 or i < 30:
                commits = get_commit_count_paginated(username, repo_name)
                analysis["activity_metrics"]["total_commits"] += commits
                
                if language and commits > 0:
                    analysis["commits_per_language"][language] += commits
                    
                time.sleep(0.1)  # Rate limiting for commit API
            
            # Activity tracking
            if updated_at:
                repo_date = parse_github_datetime(updated_at)  # Use the new function
                if repo_date:  # Check if parsing was successful
                    # Update last activity date safely
                    if not analysis["activity_metrics"]["last_activity_date"]:
                        analysis["activity_metrics"]["last_activity_date"] = updated_at
                    else:
                        current_last = parse_github_datetime(analysis["activity_metrics"]["last_activity_date"])
                        if current_last and repo_date > current_last:
                            analysis["activity_metrics"]["last_activity_date"] = updated_at
                    
                    # Check if repo was updated in last 6 months
                    six_months_ago = datetime.now().replace(tzinfo=repo_date.tzinfo) - timedelta(days=180)
                    if repo_date > six_months_ago:
                        analysis["activity_metrics"]["repos_with_recent_activity"] += 1
            
            # Popularity metrics
            analysis["popularity_metrics"]["total_stars"] += stars
            analysis["popularity_metrics"]["total_forks"] += forks
            analysis["popularity_metrics"]["total_watchers"] += watchers
            
            if stars > 0:
                analysis["popularity_metrics"]["repos_with_stars"] += 1
            
            if stars > analysis["popularity_metrics"]["most_starred_repo"]["stars"]:
                analysis["popularity_metrics"]["most_starred_repo"] = {
                    "name": repo_name,
                    "stars": stars,
                    "description": description,
                    "url": repo_url
                }
            
            # Get README for ALL repos (comprehensive analysis)
            readme_content = get_repo_readme(username, repo_name)
            time.sleep(0.1)  # Rate limiting
            
            # Enhanced skills analysis from multiple sources
            repo_skills = extract_skills_from_repo_structure(repo, readme_content)
            desc_skills = extract_skills_from_text(description)
            
            # Update skill counters
            analysis["skills_analysis"]["description_keywords"].update(desc_skills)
            analysis["skills_analysis"]["all_inferred_skills"].update(repo_skills)
            
            if readme_content:
                readme_skills = extract_skills_from_text(readme_content)
                analysis["skills_analysis"]["readme_keywords"].update(readme_skills)
                analysis["skills_analysis"]["all_inferred_skills"].update(readme_skills)
            
            # Enhanced skill categorization
            all_text = f"{description} {readme_content} {' '.join(topics)}"
            for category, keywords in SKILL_PATTERNS.items():
                category_count = 0
                for keyword in keywords:
                    if keyword in all_text.lower():
                        category_count += 1
                if category_count > 0:
                    analysis["skills_analysis"]["skill_categories"][category] += category_count
            
            # Store comprehensive repo details with enhanced skill analysis
            individual_repo_skills = extract_skills_from_repo_structure(repo, readme_content)
            analysis["repo_details"].append({
                "name": repo_name,
                "language": language,
                "stars": stars,
                "forks": forks,
                "watchers": watchers,
                "description": description,  # Full description (not truncated)
                "readme_content": readme_content,  # Full README content
                "readme_summary": readme_content[:500] + "..." if len(readme_content) > 500 else readme_content,  # First 500 chars for preview
                "topics": topics,
                "commits": commits,
                "updated_at": updated_at,
                "url": repo_url,
                "has_readme": bool(readme_content),
                "detected_skills": individual_repo_skills,  # Skills specific to this repo
                "skill_categories": {
                    category: len([skill for skill in individual_repo_skills 
                                 if skill in SKILL_PATTERNS.get(category, [])])
                    for category in SKILL_PATTERNS.keys()
                },
                "readme_length": len(readme_content) if readme_content else 0
            })
        
        # Calculate derived metrics
        total_repos = len(all_repos)
        active_repos = len([r for r in analysis["repo_details"] if r["commits"] > 0])
        
        analysis["activity_metrics"]["active_repos_count"] = active_repos
        analysis["activity_metrics"]["avg_commits_per_repo"] = round(
            analysis["activity_metrics"]["total_commits"] / max(total_repos, 1), 2
        )
        
        analysis["popularity_metrics"]["avg_stars_per_repo"] = round(
            analysis["popularity_metrics"]["total_stars"] / max(total_repos, 1), 2
        )
        
        # Convert collections to regular dicts for JSON serialization
        analysis["language_distribution"] = dict(analysis["language_distribution"])
        analysis["stars_per_language"] = dict(analysis["stars_per_language"])
        analysis["commits_per_language"] = dict(analysis["commits_per_language"])
        analysis["top_repo_per_language"] = dict(analysis["top_repo_per_language"])
        analysis["skills_analysis"]["topics_used"] = dict(analysis["skills_analysis"]["topics_used"])
        analysis["skills_analysis"]["readme_keywords"] = dict(analysis["skills_analysis"]["readme_keywords"])
        analysis["skills_analysis"]["description_keywords"] = dict(analysis["skills_analysis"]["description_keywords"])
        analysis["skills_analysis"]["all_inferred_skills"] = dict(analysis["skills_analysis"]["all_inferred_skills"])
        analysis["skills_analysis"]["skill_categories"] = dict(analysis["skills_analysis"]["skill_categories"])
        
        # Generate insights
        primary_language = max(analysis["language_distribution"], key=analysis["language_distribution"].get) if analysis["language_distribution"] else "Unknown"
        most_starred_language = max(analysis["stars_per_language"], key=analysis["stars_per_language"].get) if analysis["stars_per_language"] else "Unknown"
        
        total_commits = analysis["activity_metrics"]["total_commits"]
        total_stars = analysis["popularity_metrics"]["total_stars"]
        
        analysis["insights"] = {
            "primary_language": primary_language,
            "most_influential_language": most_starred_language,
            "activity_level": "High" if total_commits > 500 else "Medium" if total_commits > 100 else "Low",
            "popularity_level": "High" if total_stars > 100 else "Medium" if total_stars > 20 else "Low",
            "skill_diversity": len(analysis["skills_analysis"]["all_inferred_skills"]),
            "top_skills": list(Counter(analysis["skills_analysis"]["all_inferred_skills"]).most_common(10)),
            "most_used_topics": list(Counter(analysis["skills_analysis"]["topics_used"]).most_common(10)),
            "language_diversity": len(analysis["language_distribution"]),
            "contribution_consistency": "High" if analysis["activity_metrics"]["repos_with_recent_activity"] > total_repos * 0.3 else "Medium" if analysis["activity_metrics"]["repos_with_recent_activity"] > total_repos * 0.1 else "Low"
        }
        
        # Add metadata
        analysis["metadata"] = {
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "total_repos_analyzed": total_repos,
            "analysis_duration_seconds": round(time.time() - start_time, 2),
            "commit_data_coverage": f"{active_repos}/{total_repos} repos",
            "readme_analysis_coverage": len([r for r in analysis["repo_details"] if r["has_readme"]])
        }
        
        print(f"Deep analysis completed in {analysis['metadata']['analysis_duration_seconds']} seconds")
        
        return jsonify(analysis)
        
    except Exception as e:
        print(f"Deep analysis error: {str(e)}")
        return jsonify({"error": f"Deep analysis failed: {str(e)}"}), 500

@app.get("/deep-search/<string:username>/summary")
def deep_search_summary(username):
    """Quick summary version of deep search for faster responses"""
    try:
        # Get basic user info
        user_url = f"{GITHUB_API_URL}/users/{username}"
        user_resp = requests.get(user_url, headers=HEADERS)
        
        if user_resp.status_code != 200:
            return jsonify({"error": "User not found"}), 404
            
        user_data = user_resp.json()
        
        # Get limited repos (first 50)
        repos_url = f"{user_url}/repos?per_page=50&sort=updated"
        repos_resp = requests.get(repos_url, headers=HEADERS)
        
        # Better error handling for repos
        repos = []
        if repos_resp.status_code == 200:
            repos_data = repos_resp.json()
            if isinstance(repos_data, list):
                repos = repos_data
            else:
                print(f"Unexpected repos response: {repos_data}")
                return jsonify({"error": "Failed to fetch repositories"}), 500
        else:
            print(f"Failed to fetch repos: {repos_resp.status_code}")
            return jsonify({"error": "Failed to fetch repositories"}), 500
        
        if not repos:
            return jsonify({"error": "No repositories found"}), 404
        
        # Quick analysis with enhanced skills and README for each repo
        languages = Counter()
        total_stars = 0
        all_skills = Counter()
        
        for repo in repos[:30]:  # Limit processing
            # Ensure repo is a dict
            if not isinstance(repo, dict):
                continue
                
            if repo.get("language"):
                languages[repo["language"]] += 1
            
            total_stars += repo.get("stargazers_count", 0)
            
            # Get README content for better skill detection
            readme_content = get_repo_readme(username, repo.get("name", ""))
            time.sleep(0.05)  # Rate limiting
            
            # Enhanced skill detection for summary (now with README)
            repo_skills = extract_skills_from_repo_structure(repo, readme_content)
            all_skills.update(repo_skills)
        
        # Build enhanced top repos list with skills and README
        top_repos = []
        try:
            sorted_repos = sorted(repos, key=lambda x: x.get("stargazers_count", 0) if isinstance(x, dict) else 0, reverse=True)
            for repo in sorted_repos[:5]:
                if isinstance(repo, dict):
                    # Get README for each top repo
                    readme_content = get_repo_readme(username, repo.get("name", ""))
                    repo_skills = extract_skills_from_repo_structure(repo, readme_content)
                    time.sleep(0.05)  # Rate limiting
                    
                    top_repos.append({
                        "name": repo.get("name", "Unknown"),
                        "stars": repo.get("stargazers_count", 0),
                        "language": repo.get("language"),
                        "description": repo.get("description", "") or "",
                        "readme_content": readme_content,  # Full README content
                        "readme_length": len(readme_content) if readme_content else 0,
                        "has_readme": bool(readme_content),
                        "detected_skills": repo_skills[:10]  # Top 10 skills for this repo
                    })
        except Exception as sort_error:
            print(f"Error sorting repos: {sort_error}")
            # Fallback: just take first 5 repos
            for repo in repos[:5]:
                if isinstance(repo, dict):
                    # Get README for each fallback repo
                    readme_content = get_repo_readme(username, repo.get("name", ""))
                    repo_skills = extract_skills_from_repo_structure(repo, readme_content)
                    time.sleep(0.05)  # Rate limiting
                    
                    top_repos.append({
                        "name": repo.get("name", "Unknown"),
                        "stars": repo.get("stargazers_count", 0),
                        "language": repo.get("language"),
                        "description": repo.get("description", "") or "",
                        "readme_content": readme_content,  # Full README content
                        "readme_length": len(readme_content) if readme_content else 0,
                        "has_readme": bool(readme_content),
                        "detected_skills": repo_skills[:10]
                    })
        
        summary = {
            "username": username,
            "basic_info": {
                "name": user_data.get("name"),
                "followers": user_data.get("followers", 0),
                "public_repos": user_data.get("public_repos", 0),
                "location": user_data.get("location")
            },
            "top_languages": dict(languages.most_common(5)),
            "total_stars": total_stars,
            "avg_stars": round(total_stars / max(len(repos), 1), 2),
            "detected_skills": dict(all_skills.most_common(15)),  # Top 15 detected skills
            "skill_categories": {
                category: len([skill for skill in all_skills.keys() 
                             if skill in SKILL_PATTERNS.get(category, [])])
                for category in SKILL_PATTERNS.keys()
            },
            "top_repos": top_repos
        }
        
        return jsonify(summary)
        
    except Exception as e:
        print(f"Summary analysis error details: {str(e)}")
        return jsonify({"error": f"Summary analysis failed: {str(e)}"}), 500

@app.post("/match-candidate/<string:username>")
def match_single_candidate(username):
    """
    Match a single candidate against job requirements
    """
    try:
        data = request.get_json()
        job_description = data.get("job_description", "")
        required_skills = [skill.lower() for skill in data.get("required_skills", [])]
        nice_to_have = [skill.lower() for skill in data.get("nice_to_have", [])]
        candidate_data = data.get("candidate_data", {})
        
        if not candidate_data:
            return jsonify({"error": "No candidate data provided"}), 400
        
        job_skills_from_desc = extract_skills_from_text(job_description)
        all_job_skills = list(set(required_skills + nice_to_have + job_skills_from_desc))
        
        top_repos = candidate_data.get("top_repos", [])
        
        if not top_repos:
            return jsonify({
                "candidate_username": username,
                "total_match_percentage": 0,
                "repo_matches": []
            })
        
        repo_matches = []
        weighted_scores = []
        total_weight = 0
        
        for repo in top_repos:
            repo_name = repo.get("name", "")
            repo_skills = repo.get("detected_skills", [])
            readme_content = repo.get("readme_content", "")
            description = repo.get("description", "")
            stars = repo.get("stars", 0)
            readme_length = repo.get("readme_length", 0)
            
            repo_skills_lower = [skill.lower() for skill in repo_skills]
            
            required_matches = len(set(required_skills) & set(repo_skills_lower))
            required_score = (required_matches / max(len(required_skills), 1)) * 70
            
            nice_to_have_matches = len(set(nice_to_have) & set(repo_skills_lower))
            nice_to_have_score = (nice_to_have_matches / max(len(nice_to_have), 1)) * 15
            
            all_text = f"{description} {readme_content}".lower()
            context_matches = sum(1 for skill in all_job_skills if skill in all_text)
            context_score = min((context_matches / max(len(all_job_skills), 1)) * 10, 10)
            
            readme_bonus = min(readme_length / 1000, 1) * 3
            popularity_bonus = min(stars / 10, 1) * 2
            
            repo_match_percentage = min(
                required_score + nice_to_have_score + context_score + readme_bonus + popularity_bonus,
                100
            )
            
            repo_matches.append({
                "repo_name": repo_name,
                "match_percentage": round(repo_match_percentage, 0)
            })
            
            repo_weight = max(stars, 1) * max(readme_length / 100, 1)
            weighted_scores.append(repo_match_percentage * repo_weight)
            total_weight += repo_weight
        
        total_match_percentage = sum(weighted_scores) / total_weight if total_weight > 0 else 0
        
        repo_matches.sort(key=lambda x: x["match_percentage"], reverse=True)
        
        return jsonify({
            "candidate_username": username,
            "total_match_percentage": round(total_match_percentage, 0),
            "repo_matches": repo_matches
        })
        
    except Exception as e:
        print(f"Match single candidate error: {str(e)}")
        return jsonify({"error": f"Matching failed: {str(e)}"}), 500
    
@app.post("/match-candidate-ai/<string:username>")
def match_single_candidate_ai(username):
    """
    AI-powered matching for a single candidate using Gemini
    """
    try:
        data = request.get_json()
        job_description = data.get("job_description", "")
        required_skills = data.get("required_skills", [])
        nice_to_have = data.get("nice_to_have", [])
        candidate_data = data.get("candidate_data", {})
        
        if not candidate_data:
            return jsonify({"error": "No candidate data provided"}), 400
        
        if not job_description:
            return jsonify({"error": "Job description is required"}), 400
        
        model = genai.GenerativeModel('gemini-1.5-flash')  # type: ignore
        
        top_repos = candidate_data.get("top_repos", [])
        
        if not top_repos:
            return jsonify({
                "candidate_username": username,
                "total_match_percentage": 0,
                "repo_matches": []
            })
        
        repo_matches = []
        
        for repo in top_repos:
            repo_name = repo.get("name", "")
            description = repo.get("description", "")
            readme_content = repo.get("readme_content", "")
            detected_skills = repo.get("detected_skills", [])
            
            repo_context = f"""
Repository: {repo_name}
Description: {description}
README Content: {readme_content[:1500]}...
Detected Skills: {', '.join(detected_skills)}
"""
            
            repo_prompt = f"""
You are an expert technical recruiter. Analyze this GitHub repository against the job requirements and provide a match percentage (0-100).

JOB REQUIREMENTS:
Job Description: {job_description}
Required Skills: {', '.join(required_skills)}
Nice-to-Have Skills: {', '.join(nice_to_have)}

REPOSITORY TO ANALYZE:
{repo_context}

ANALYSIS CRITERIA:
1. Technical skill alignment (50% weight)
2. Project relevance to job role (25% weight)
3. Code quality indicators (README, documentation) (15% weight)
4. Project complexity and impact (10% weight)

RESPONSE FORMAT:
Provide ONLY a JSON object with this exact structure:
{{
    "match_percentage": <integer 0-100>,
    "reasoning": "<brief 2-3 sentence explanation>"
}}

Be strict but fair in scoring. Only give high scores (80+) for excellent matches.
"""
            
            try:
                response = model.generate_content(repo_prompt)
                response_text = response.text.strip()
                
                if response_text.startswith('```json'):
                    response_text = response_text.replace('```json', '').replace('```', '').strip()
                
                repo_analysis = json.loads(response_text)
                
                repo_matches.append({
                    "repo_name": repo_name,
                    "match_percentage": int(repo_analysis.get("match_percentage", 0))
                })
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Error analyzing repo {repo_name}: {str(e)}")
                fallback_score = 0
                repo_skills_text = ' '.join(detected_skills + [description, repo_name]).lower()
                required_matches = sum(1 for skill in required_skills if skill.lower() in repo_skills_text)
                if required_matches > 0:
                    fallback_score = min(required_matches * 25, 75)
                
                repo_matches.append({
                    "repo_name": repo_name,
                    "match_percentage": fallback_score
                })
        
        total_match_percentage = 0
        if repo_matches:
            candidate_summary = f"""
Candidate: {username}
Repository Scores: {repo_matches}
Candidate Skills: {candidate_data.get('detected_skills', {})}
Top Languages: {candidate_data.get('top_languages', {})}
"""
            
            overall_prompt = f"""
Based on the repository analysis, provide an overall candidate match percentage (0-100).

JOB REQUIREMENTS:
Job Description: {job_description}
Required Skills: {', '.join(required_skills)}
Nice-to-Have Skills: {', '.join(nice_to_have)}

CANDIDATE ANALYSIS:
{candidate_summary}

Provide ONLY an integer between 0-100.
"""
            
            try:
                overall_response = model.generate_content(overall_prompt)
                total_match_percentage = int(overall_response.text.strip())
            except Exception as e:
                print(f"Error calculating overall match: {str(e)}")
                total_match_percentage = round(sum(r["match_percentage"] for r in repo_matches) / len(repo_matches)) if repo_matches else 0
        
        repo_matches.sort(key=lambda x: x["match_percentage"], reverse=True)
        
        return jsonify({
            "candidate_username": username,
            "total_match_percentage": total_match_percentage,
            "repo_matches": repo_matches
        })
        
    except Exception as e:
        print(f"Single candidate AI matching error: {str(e)}")
        return jsonify({"error": f"AI matching failed: {str(e)}"}), 500

@app.route("/api/candidates", methods=["POST"])
def create_candidate():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400
        
        if "resumeFile" not in data or "data" not in data["resumeFile"]:
            return jsonify({"error": "resumeFile data is missing"}), 400
            
        resume_file_data = data.pop("resumeFile")
        
        try:
            file_bytes = base64.b64decode(resume_file_data["data"])
            file_id = fs.put(
                file_bytes, 
                filename=data.get("filename", "untitled.dat"), 
                contentType=resume_file_data.get("type")
            )
            data["resumeFileId"] = str(file_id)
            data["resumeFileType"] = resume_file_data.get("type")
        except (ValueError, TypeError, binascii.Error) as e:
            print(f"Base64 decode error: {e}")
            return jsonify({"error": "Invalid base64 data for resume file"}), 400

        data["createdAt"] = datetime.now(timezone.utc)
        
        result = candidates_collection.insert_one(data)
        
        new_candidate = candidates_collection.find_one({"_id": result.inserted_id})
        
        return jsonify(make_serializable(new_candidate)), 201
    except Exception as e:
        print(f"Error creating candidate: {e}")
        return jsonify({"error": "Unable to create candidate"}), 500

@app.route("/api/candidates", methods=["GET"])
def get_candidates():
    try:
        job_id = request.args.get("jobId")
        if not job_id:
            return jsonify({"error": "jobId is required"}), 400

        candidates = list(candidates_collection.find({"jobId": job_id}).sort("score", -1))
        
        serializable_candidates = [make_serializable(c) for c in candidates]
            
        return jsonify(serializable_candidates), 200
    except Exception as e:
        print(f"Error fetching candidates: {e}")
        return jsonify({"error": "Unable to fetch candidates"}), 500

@app.route("/api/resumes/<candidate_id>", methods=["GET"])
def get_resume_file(candidate_id):
    try:
        candidate = candidates_collection.find_one({"_id": ObjectId(candidate_id)})
        if not candidate or "resumeFileId" not in candidate:
            return jsonify({"error": "Resume not found"}), 404
        
        file_id = ObjectId(candidate["resumeFileId"])
        grid_out = fs.get(file_id)

        return send_file(
            io.BytesIO(grid_out.read()),
            mimetype=grid_out.content_type,
            as_attachment=False,
            download_name=grid_out.filename
        )

    except Exception as e:
        print(f"Error fetching resume file: {e}")
        return jsonify({"error": "Unable to fetch resume file"}), 500
@app.get("/activity-score/<string:username>")
def get_activity_score(username):
    """
    Fast activity and growth scoring (0-100) based on GitHub metrics
    
    Scoring factors:
    - Commit frequency (30%)
    - Recent activity (25%) 
    - Consistency (20%)
    - Repository activity (15%)
    - Growth trend (10%)
    """
    try:
        # Get user data
        user_url = f"{GITHUB_API_URL}/users/{username}"
        user_resp = requests.get(user_url, headers=HEADERS)
        
        if user_resp.status_code != 200:
            return jsonify({"error": "User not found"}), 404
            
        user_data = user_resp.json()
        
        # Get repositories (limited for speed)
        repos_url = f"{user_url}/repos?per_page=30&sort=updated"
        repos_resp = requests.get(repos_url, headers=HEADERS)
        
        if repos_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch repositories"}), 500
            
        repos = repos_resp.json()
        
        if not repos:
            return jsonify({
                "username": username,
                "activity_score": 0,
                "breakdown": {
                    "commit_frequency": 0,
                    "recent_activity": 0,
                    "consistency": 0,
                    "repository_activity": 0,
                    "growth_trend": 0
                },
                "details": {
                    "total_repos": 0,
                    "active_repos": 0,
                    "recent_commits": 0,
                    "account_age_months": 0
                }
            })
        
        # Calculate account age
        created_at = datetime.fromisoformat(user_data.get("created_at", "").replace('Z', '+00:00'))
        account_age_months = max((datetime.now(created_at.tzinfo) - created_at).days / 30, 1)
        
        # Initialize scoring variables
        total_commits = 0
        recent_activity_count = 0
        active_repos = 0
        last_commit_dates = []
        
        # Analyze repositories (quick analysis)
        for i, repo in enumerate(repos[:20]):  # Limit to 20 repos for speed
            repo_name = repo.get("name", "")
            updated_at = repo.get("updated_at")
            
            # Check if repo was updated recently (last 6 months)
            if updated_at:
                repo_date = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                days_since_update = (datetime.now(repo_date.tzinfo) - repo_date).days
                
                if days_since_update <= 180:  # 6 months
                    recent_activity_count += 1
                    active_repos += 1
                    last_commit_dates.append(repo_date)
        
        # Get recent commit activity (using events API for speed)
        try:
            events_url = f"{user_url}/events?per_page=100"
            events_resp = requests.get(events_url, headers=HEADERS)
            
            if events_resp.status_code == 200:
                events = events_resp.json()
                
                # Count push events in last 3 months
                three_months_ago = datetime.now() - timedelta(days=90)
                recent_commits = 0
                
                for event in events:
                    if event.get("type") == "PushEvent":
                        event_date = datetime.fromisoformat(event.get("created_at", "").replace('Z', '+00:00'))
                        if event_date.replace(tzinfo=None) > three_months_ago:
                            # Estimate commits from push event
                            commits_in_push = len(event.get("payload", {}).get("commits", []))
                            recent_commits += max(commits_in_push, 1)
                
                total_commits = recent_commits
                
        except Exception as e:
            print(f"Events API error: {e}")
            # Fallback: estimate from repo count and age
            total_commits = max(len(repos) * 5, 10)
        
        # SCORING ALGORITHM
        
        # 1. Commit Frequency Score (30% weight)
        # Normalize commits per month
        commits_per_month = total_commits / max(account_age_months / 3, 1)  # Last 3 months
        commit_frequency_score = min(commits_per_month * 5, 100)  # 20 commits/month = 100 points
        
        # 2. Recent Activity Score (25% weight)
        # Based on repos updated in last 6 months
        recent_activity_score = min((recent_activity_count / max(len(repos), 1)) * 100, 100)
        
        # 3. Consistency Score (20% weight)
        # Based on account age and continuous activity
        if account_age_months >= 12:  # At least 1 year old
            consistency_base = 50
            if recent_activity_count > 0:
                consistency_base += 30  # Active in recent months
            if total_commits > 50:
                consistency_base += 20  # Good commit volume
            consistency_score = min(consistency_base, 100)
        else:
            # Newer accounts get score based on activity level
            consistency_score = min(recent_activity_count * 10, 60)
        
        # 4. Repository Activity Score (15% weight)
        # Based on number of active repositories
        repo_activity_score = min((active_repos / max(len(repos), 1)) * 100, 100)
        
        # 5. Growth Trend Score (10% weight)
        # Simple estimation based on recent activity vs account age
        if account_age_months > 6:
            expected_activity = account_age_months / 12 * 10  # Expected repos per year
            actual_activity = len(repos)
            growth_ratio = actual_activity / max(expected_activity, 1)
            growth_trend_score = min(growth_ratio * 50, 100)
        else:
            # New accounts: score based on quick start
            growth_trend_score = min(len(repos) * 15, 100)
        
        # Calculate weighted final score
        final_score = (
            commit_frequency_score * 0.30 +
            recent_activity_score * 0.25 +
            consistency_score * 0.20 +
            repo_activity_score * 0.15 +
            growth_trend_score * 0.10
        )
        
        # Round scores for clean output
        breakdown = {
            "commit_frequency": round(commit_frequency_score),
            "recent_activity": round(recent_activity_score),
            "consistency": round(consistency_score),
            "repository_activity": round(repo_activity_score),
            "growth_trend": round(growth_trend_score)
        }
        
        details = {
            "total_repos": len(repos),
            "active_repos": active_repos,
            "recent_commits": total_commits,
            "account_age_months": round(account_age_months, 1)
        }
        
        return jsonify({
            "username": username,
            "activity_score": round(final_score),
            "breakdown": breakdown,
            "details": details
        })
        
    except Exception as e:
        print(f"Activity score error: {str(e)}")
        return jsonify({"error": f"Activity scoring failed: {str(e)}"}), 500
        
@app.get("/readme-analysis/<string:username>")
def analyze_user_readmes(username):
    """
    AI-powered README analysis using existing deep-scan data and Gemini
    Returns score and detailed feedback for each README
    """
    try:
        # Use existing deep-search function to get comprehensive repo data
        print(f"Getting deep scan data for {username}")
        
        # Get user data first
        user_url = f"{GITHUB_API_URL}/users/{username}"
        user_resp = requests.get(user_url, headers=HEADERS)
        
        if user_resp.status_code != 200:
            return jsonify({"error": "User not found"}), 404
        
        # Get repositories with README content (using existing logic)
        repos_url = f"{user_url}/repos?per_page=50&sort=updated"
        repos_resp = requests.get(repos_url, headers=HEADERS)
        
        if repos_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch repositories"}), 500
            
        repos = repos_resp.json()
        
        if not repos:
            return jsonify({"error": "No repositories found"}), 404
        
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        readme_analyses = []
        total_score = 0
        repos_with_readme = 0
        
        # Analyze each repository's README with AI
        for repo in repos[:30]:  # Limit to 30 repos for performance
            repo_name = repo.get("name", "")
            repo_url = repo.get("html_url", "")
            description = repo.get("description", "") or ""
            language = repo.get("language", "")
            stars = repo.get("stargazers_count", 0)
            
            try:
                # Get README content using existing function
                readme_content = get_repo_readme(username, repo_name)
                
                if readme_content and len(readme_content) > 50:
                    # Use Gemini to analyze README
                    analysis = analyze_readme_with_ai(model, readme_content, repo_name, description, language, stars)
                    
                    readme_analyses.append({
                        "repo_name": repo_name,
                        "repo_url": repo_url,
                        "language": language,
                        "stars": stars,
                        "description": description,
                        "readme_score": analysis["score"],
                        "readme_length": len(readme_content),
                        "feedback": analysis["feedback"],
                        "strengths": analysis["strengths"],
                        "improvements": analysis["improvements"],
                        "has_readme": True
                    })
                    
                    total_score += analysis["score"]
                    repos_with_readme += 1
                else:
                    # No README or very short
                    readme_analyses.append({
                        "repo_name": repo_name,
                        "repo_url": repo_url,
                        "language": language,
                        "stars": stars,
                        "description": description,
                        "readme_score": 0,
                        "readme_length": len(readme_content) if readme_content else 0,
                        "feedback": "No README file found or README is too short. A comprehensive README is essential for any project.",
                        "strengths": [],
                        "improvements": ["Add a detailed README.md file", "Include project description and purpose", "Add installation and usage instructions"],
                        "has_readme": False
                    })
                
                time.sleep(0.5)  # Rate limiting for Gemini API
                
            except Exception as e:
                print(f"Error analyzing README for {repo_name}: {str(e)}")
                continue
        
        # Calculate overall README score
        overall_readme_score = round(total_score / repos_with_readme, 1) if repos_with_readme > 0 else 0
        
        # Sort by README score (highest first)
        readme_analyses.sort(key=lambda x: x["readme_score"], reverse=True)
        
        # Generate overall insights with AI
        overall_insights = generate_overall_readme_insights(model, readme_analyses, overall_readme_score)
        
        return jsonify({
            "username": username,
            "overall_readme_score": overall_readme_score,
            "overall_insights": overall_insights,
            "total_repos": len(repos),
            "repos_with_readme": repos_with_readme,
            "repos_without_readme": len(repos) - repos_with_readme,
            "readme_analyses": readme_analyses
        })
        
    except Exception as e:
        return jsonify({"error": f"README analysis failed: {str(e)}"}), 500

def analyze_readme_with_ai(model, readme_content, repo_name, description, language, stars):
    """Use Gemini AI to analyze README quality and provide feedback"""
    
    # Create comprehensive prompt for README analysis
    prompt = f"""
You are an expert technical writer and developer advocate. Analyze this GitHub repository README for quality and completeness.

REPOSITORY CONTEXT:
- Name: {repo_name}
- Description: {description}
- Language: {language}
- Stars: {stars}

README CONTENT:
{readme_content[:2000]}...

ANALYSIS CRITERIA:
1. Clarity and Structure (25%)
2. Completeness (25%) - Installation, usage, examples
3. Documentation Quality (20%) - Code examples, explanations
4. Professional Presentation (15%) - Formatting, visuals
5. Project Context (15%) - Purpose, features, benefits

RESPONSE FORMAT (JSON only):
{{
    "score": <integer 0-100>,
    "feedback": "<2-3 sentence overall assessment>",
    "strengths": ["<strength1>", "<strength2>", "<strength3>"],
    "improvements": ["<improvement1>", "<improvement2>", "<improvement3>"]
}}

Be constructive and specific in your feedback. Focus on actionable improvements.
"""
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean JSON response
        if response_text.startswith('```json'):
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        import json
        analysis = json.loads(response_text)
        
        # Validate response structure
        if not all(key in analysis for key in ["score", "feedback", "strengths", "improvements"]):
            raise ValueError("Invalid response structure")
        
        # Ensure score is within range
        analysis["score"] = max(0, min(100, int(analysis["score"])))
        
        return analysis
        
    except Exception as e:
        print(f"Error in AI analysis: {str(e)}")
        # Fallback analysis
        return {
            "score": calculate_basic_readme_score(readme_content),
            "feedback": "AI analysis unavailable. Basic scoring applied based on length and structure.",
            "strengths": ["README exists"] if readme_content else [],
            "improvements": ["Improve documentation", "Add more examples", "Better structure"]
        }

def calculate_basic_readme_score(readme_content):
    """Fallback basic scoring if AI fails"""
    if not readme_content:
        return 0
    
    score = 0
    length = len(readme_content)
    
    # Length scoring
    if length > 1500:
        score += 40
    elif length > 800:
        score += 30
    elif length > 400:
        score += 20
    else:
        score += 10
    
    # Content indicators
    readme_lower = readme_content.lower()
    
    if "install" in readme_lower:
        score += 15
    if "usage" in readme_lower:
        score += 15
    if "```" in readme_content:
        score += 15
    if "# " in readme_content:
        score += 10
    if "example" in readme_lower:
        score += 5
    
    return min(score, 100)

def generate_overall_readme_insights(model, readme_analyses, overall_score):
    """Generate overall insights about user's README quality"""
    
    if not readme_analyses:
        return {
            "assessment": "No repositories to analyze",
            "recommendations": []
        }
    
    # Prepare summary for AI
    summary_data = {
        "total_repos": len(readme_analyses),
        "repos_with_readme": len([r for r in readme_analyses if r["has_readme"]]),
        "average_score": overall_score,
        "top_scores": [r["readme_score"] for r in readme_analyses[:5]],
        "common_languages": list(set([r["language"] for r in readme_analyses if r["language"]]))[:5]
    }
    
    prompt = f"""
Analyze this developer's README quality across their repositories and provide insights.

DATA SUMMARY:
- Total repositories: {summary_data["total_repos"]}
- Repositories with README: {summary_data["repos_with_readme"]}
- Average README score: {summary_data["average_score"]}/100
- Top repository scores: {summary_data["top_scores"]}
- Languages used: {summary_data["common_languages"]}

Provide a brief assessment and 3-5 specific recommendations for improving README quality across their portfolio.

RESPONSE FORMAT (JSON only):
{{
    "assessment": "<2-3 sentence overall assessment>",
    "recommendations": ["<rec1>", "<rec2>", "<rec3>", "<rec4>", "<rec5>"]
}}
"""
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        if response_text.startswith('```json'):
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        import json
        insights = json.loads(response_text)
        return insights
        
    except Exception as e:
        print(f"Error generating insights: {str(e)}")
        # Fallback insights
        assessment = "Average README quality" if overall_score >= 50 else "README quality needs improvement"
        
        return {
            "assessment": f"{assessment}. Focus on creating comprehensive documentation for all projects.",
            "recommendations": [
                "Add READMEs to repositories that don't have them",
                "Include installation and usage instructions",
                "Add code examples and demos",
                "Improve formatting with proper headings",
                "Include project descriptions and purposes"
            ]
        }
@app.get("/code-proficiency/<string:username>")
def get_code_proficiency(username):
    """
    Calculates the average code proficiency score for a GitHub user
    using Lizard, HTML, and CSS analysis from the analyzer module.
    """
    try:
        from analyzer import analyze_repo_githired
        from github import Github
        from statistics import mean

        # Use your GitHub token from the environment
        token = os.getenv("GITHUB_TOKEN")
        g = Github(token) if token else Github()
        user = g.get_user(username)
        repos = user.get_repos()

        repo_scores = []
        detailed_results = []
        count = 0

        for repo in repos:
            if repo.fork:
                continue
            try:
                print(f"🔍 Analyzing {repo.name}...")
                score = analyze_repo_githired(username, repo.name, token=token)
                repo_scores.append(score["overall_score"])
                detailed_results.append({
                    "repo": repo.name,
                    "score": round(score["overall_score"], 2),
                    "avg_lizard_score": score.get("avg_lizard_score", 0),
                    "avg_html_score": score.get("avg_html_score", 0),
                    "avg_css_score": score.get("avg_css_score", 0),
                    "structure_bonus": score.get("structure_bonus", 0),
                    "file_count": score.get("file_count", 0),
                    "weights_used": score.get("weights_used", {})
                })
                count += 1
                if count >= 15:  # Limit to 15 repos for performance
                    break
            except Exception as e:
                print(f"❌ Failed to analyze {repo.name}: {e}")

        # Calculate overall proficiency level
        average_score = round(mean(repo_scores), 2) if repo_scores else 0
        
        def get_proficiency_level(score):
            if score >= 85:
                return "Expert"
            elif score >= 70:
                return "Advanced"
            elif score >= 55:
                return "Intermediate"
            elif score >= 40:
                return "Beginner"
            else:
                return "Novice"

        return jsonify({
            "username": username,
            "average_score": average_score,
            "proficiency_level": get_proficiency_level(average_score),
            "total_repos_analyzed": count,
            "repo_scores": detailed_results,
            "analysis_summary": {
                "highest_scoring_repo": max(detailed_results, key=lambda x: x["score"]) if detailed_results else None,
                "lowest_scoring_repo": min(detailed_results, key=lambda x: x["score"]) if detailed_results else None,
                "avg_file_count": round(mean([r["file_count"] for r in detailed_results]), 1) if detailed_results else 0
            }
        })

    except Exception as e:
        print(f"Error during code proficiency analysis: {str(e)}")
        return jsonify({"error": f"Failed to analyze proficiency: {str(e)}"}), 500


@app.get("/code-quality/<string:username>")
def get_code_quality(username):
    """
    Fast code quality analysis using sampling approach
    """
    try:
        from analyzer import analyze_user_code_quality
        from github import Github
        
        token = os.getenv("GITHUB_TOKEN")
        g = Github(token) if token else Github()
        result = analyze_user_code_quality(username, g)
        return jsonify(result)
    except Exception as e:
        print(f"Error during code quality analysis: {str(e)}")
        return jsonify({"error": f"Failed to analyze code quality: {str(e)}"}), 500
    
if __name__ == "__main__":
    app.run(debug=True, port=5001) 
