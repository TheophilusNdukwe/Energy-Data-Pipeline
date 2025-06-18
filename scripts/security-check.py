#!/usr/bin/env python3
"""
Security check script for Energy Pipeline Backend
Scans for potential hardcoded secrets and validates environment setup
"""

import os
import re
import sys
from pathlib import Path

def check_env_file():
    """Check if .env file exists and is properly configured"""
    print("🔍 Checking environment configuration...")
    
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists():
        print("❌ .env file not found")
        if env_example.exists():
            print("💡 Run: cp .env.example .env")
        return False
    
    print("✅ .env file exists")
    
    # Check if .env is in .gitignore
    gitignore = Path(".gitignore")
    if gitignore.exists():
        with open(gitignore, 'r') as f:
            gitignore_content = f.read()
            if '.env' in gitignore_content:
                print("✅ .env is excluded from git")
            else:
                print("❌ .env is NOT excluded from git - add it to .gitignore")
                return False
    
    return True

def check_required_env_vars():
    """Check if required environment variables are set"""
    print("\n🔑 Checking required environment variables...")
    
    from dotenv import load_dotenv
    load_dotenv()
    
    required_vars = [
        'DB_PASSWORD',
        'EIA_API_KEY', 
        'OPENWEATHER_API_KEY'
    ]
    
    missing = []
    weak = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing.append(var)
        elif value in ['changeme', 'your_password_here', 'your_eia_api_key_here', 'your_openweather_api_key_here', 'password123']:
            weak.append(var)
    
    if missing:
        print(f"❌ Missing environment variables: {missing}")
        return False
    
    if weak:
        print(f"⚠️ Weak/placeholder values found: {weak}")
        print("   Please set real values in your .env file")
        return False
    
    print("✅ All required environment variables are properly set")
    return True

def scan_for_hardcoded_secrets():
    """Scan Python files for potential hardcoded secrets"""
    print("\n🔍 Scanning for hardcoded secrets...")
    
    # Patterns that might indicate secrets
    patterns = [
        (r'password\s*[=:]\s*["\'][^"\']{3,}["\']', 'Potential hardcoded password'),
        (r'api_key\s*[=:]\s*["\'][A-Za-z0-9]{15,}["\']', 'Potential hardcoded API key'),
        (r'secret\s*[=:]\s*["\'][^"\']{8,}["\']', 'Potential hardcoded secret'),
        (r'token\s*[=:]\s*["\'][^"\']{10,}["\']', 'Potential hardcoded token'),
    ]
    
    issues_found = []
    
    # Scan Python files
    for py_file in Path('.').rglob('*.py'):
        # Skip certain directories
        if any(skip in str(py_file) for skip in ['venv/', '__pycache__/', '.git/', 'node_modules/']):
            continue
            
        try:
            with open(py_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            for line_num, line in enumerate(content.split('\n'), 1):
                for pattern, description in patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        # Skip if it's clearly a placeholder
                        if any(placeholder in line.lower() for placeholder in 
                               ['example', 'placeholder', 'your_', 'changeme', 'not_configured', 'dummy']):
                            continue
                        
                        issues_found.append({
                            'file': py_file,
                            'line': line_num,
                            'description': description,
                            'content': line.strip()
                        })
        except Exception as e:
            print(f"Warning: Could not scan {py_file}: {e}")
    
    if issues_found:
        print(f"❌ Found {len(issues_found)} potential security issues:")
        for issue in issues_found:
            print(f"   📁 {issue['file']}:{issue['line']}")
            print(f"   🚨 {issue['description']}")
            print(f"   📝 {issue['content']}")
            print()
        return False
    else:
        print("✅ No hardcoded secrets found")
        return True

def main():
    """Run all security checks"""
    print("🔒 Energy Pipeline Security Check")
    print("=" * 40)
    
    checks_passed = 0
    total_checks = 3
    
    # Run checks
    if check_env_file():
        checks_passed += 1
    
    if check_required_env_vars():
        checks_passed += 1
    
    if scan_for_hardcoded_secrets():
        checks_passed += 1
    
    # Summary
    print("\n" + "=" * 40)
    print(f"📊 Security Check Results: {checks_passed}/{total_checks} passed")
    
    if checks_passed == total_checks:
        print("🎉 All security checks passed!")
        print("✅ Your project is secure from common credential exposure issues")
        return 0
    else:
        print("⚠️ Some security issues need attention")
        print("🔧 Please fix the issues above before proceeding")
        return 1

if __name__ == "__main__":
    sys.exit(main())