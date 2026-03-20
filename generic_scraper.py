#!/usr/bin/env python3
"""
Generic Twitter/X Scraper - Search ANY topics by keywords
Completely configurable, no hardcoded content
"""

import argparse
import json
import time
import logging
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from datetime import datetime
import sqlite3
from typing import List, Dict
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)


def setup_driver():
    """Setup Chrome driver for container environment"""
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--remote-debugging-port=9222')
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)


def load_config(config_file: str = None) -> Dict:
    """Load configuration from JSON file"""
    if config_file:
        try:
            with open(config_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return {}
    return {}


def search_keywords_nitter(driver, nitter_url: str, keywords: List[str], max_results: int = 50) -> List[Dict]:
    """Search for tweets containing keywords"""
    results = []
    
    for keyword in keywords:
        logger.info(f"🔍 Searching for: '{keyword}'")
        
        # Create search query
        search_query = keyword.replace(' ', '+')
        url = f"{nitter_url}/search?q={search_query}"
        
        try:
            driver.get(url)
            time.sleep(3)
            
            # Check for rate limit
            if 'rate limited' in driver.page_source.lower():
                logger.warning(f"   ⚠️  Rate limited on {nitter_url}")
                return None
            
            # Find tweet items
            tweets = driver.find_elements(By.CSS_SELECTOR, '.timeline-item')
            logger.info(f"   Found {len(tweets)} results")
            
            for tweet in tweets[:max_results]:
                try:
                    # Extract username
                    username_elem = tweet.find_element(By.CSS_SELECTOR, '.username')
                    username = username_elem.text.replace('@', '').strip()
                    
                    # Extract tweet content
                    text_elem = tweet.find_element(By.CSS_SELECTOR, '.tweet-content')
                    text = text_elem.text.strip()
                    
                    # Extract timestamp
                    time_elem = tweet.find_element(By.CSS_SELECTOR, '.tweet-date a')
                    timestamp = time_elem.get_attribute('title') or time_elem.text
                    
                    # Extract engagement stats
                    stats = tweet.find_elements(By.CSS_SELECTOR, '.icon-container')
                    replies = retweets = likes = "0"
                    try:
                        if len(stats) >= 3:
                            replies = stats[0].text.strip() or "0"
                            retweets = stats[1].text.strip() or "0"
                            likes = stats[2].text.strip() or "0"
                    except:
                        pass
                    
                    results.append({
                        'username': username,
                        'text': text,
                        'timestamp': timestamp,
                        'likes': likes,
                        'retweets': retweets,
                        'replies': replies,
                        'keyword': keyword,
                        'scraped_at': datetime.now().isoformat()
                    })
                    
                except Exception as e:
                    continue
            
            time.sleep(2)
            
        except Exception as e:
            logger.error(f"   ❌ Error searching '{keyword}': {str(e)[:50]}")
            continue
    
    return results


def scrape_accounts(driver, nitter_url: str, accounts: List[str], max_tweets: int = 15, keyword_filter: List[str] = None) -> List[Dict]:
    """Scrape specific accounts"""
    results = []
    
    for account in accounts:
        logger.info(f"   📱 Scraping @{account}...")
        url = f"{nitter_url}/{account}"
        
        try:
            driver.get(url)
            time.sleep(3)
            
            # Check for rate limit
            if 'rate limited' in driver.page_source.lower():
                logger.warning(f"   ⚠️  Rate limited")
                return None
            
            tweets = driver.find_elements(By.CSS_SELECTOR, '.timeline-item')
            
            for tweet in tweets[:max_tweets]:
                try:
                    text_elem = tweet.find_element(By.CSS_SELECTOR, '.tweet-content')
                    time_elem = tweet.find_element(By.CSS_SELECTOR, '.tweet-date a')
                    stats = tweet.find_elements(By.CSS_SELECTOR, '.icon-container')
                    
                    text = text_elem.text.strip()
                    
                    # Filter by keywords if provided
                    if keyword_filter:
                        text_lower = text.lower()
                        if not any(kw.lower() in text_lower for kw in keyword_filter):
                            continue
                    
                    # Extract engagement
                    replies = retweets = likes = "0"
                    try:
                        if len(stats) >= 3:
                            replies = stats[0].text.strip() or "0"
                            retweets = stats[1].text.strip() or "0"
                            likes = stats[2].text.strip() or "0"
                    except:
                        pass
                    
                    results.append({
                        'username': account,
                        'text': text,
                        'timestamp': time_elem.get_attribute('title') or time_elem.text,
                        'likes': likes,
                        'retweets': retweets,
                        'replies': replies,
                        'scraped_at': datetime.now().isoformat()
                    })
                    
                except Exception as e:
                    continue
            
            logger.info(f"   ✅ Found {len([r for r in results if r['username'] == account])} tweets")
            time.sleep(1)
            
        except Exception as e:
            logger.error(f"   ❌ Error: {str(e)[:50]}")
            continue
    
    return results


def save_to_database(tweets: List[Dict], db_name: str = "scraped_tweets.db"):
    """Save tweets to SQLite database"""
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tweets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            text TEXT,
            timestamp TEXT,
            likes TEXT,
            retweets TEXT,
            replies TEXT,
            keyword TEXT,
            scraped_at TEXT
        )
    ''')
    
    for tweet in tweets:
        cursor.execute('''
            INSERT INTO tweets (username, text, timestamp, likes, retweets, replies, keyword, scraped_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            tweet.get('username'),
            tweet.get('text'),
            tweet.get('timestamp'),
            tweet.get('likes'),
            tweet.get('retweets'),
            tweet.get('replies'),
            tweet.get('keyword', ''),
            tweet.get('scraped_at')
        ))
    
    conn.commit()
    conn.close()
    logger.info(f"✅ Saved {len(tweets)} tweets to {db_name}")


def display_results(tweets: List[Dict], max_display: int = 20):
    """Display scraped tweets"""
    if not tweets:
        print("\n❌ No tweets found")
        return
    
    print("\n" + "=" * 80)
    print(f"📊 FOUND {len(tweets)} TWEETS")
    print("=" * 80)
    
    for i, tweet in enumerate(tweets[:max_display], 1):
        print(f"\n#{i} - @{tweet['username']}")
        print(f"📅 {tweet['timestamp']}")
        print(f"💬 {tweet['text'][:300]}")
        if len(tweet['text']) > 300:
            print(f"   ... (truncated)")
        print(f"❤️  {tweet['likes']} | 🔄 {tweet['retweets']} | 💭 {tweet['replies']}")
        if 'keyword' in tweet and tweet['keyword']:
            print(f"🔍 Keyword: {tweet['keyword']}")
        print("─" * 80)
    
    if len(tweets) > max_display:
        print(f"\n... and {len(tweets) - max_display} more tweets")


def interactive_mode():
    """Interactive mode for entering search parameters"""
    print("\n" + "=" * 80)
    print("🔍 INTERACTIVE MODE - Configure Your Search")
    print("=" * 80)
    
    print("\n💡 TIP: Account scraping is more reliable than keyword search!")
    print("   Recommended: Provide both accounts AND keywords for best results")
    
    # Get accounts FIRST (more reliable)
    print("\n👥 Enter Twitter accounts to scrape (comma-separated):")
    print("   Example: CNN,BBCWorld,Reuters (for news)")
    print("   Example: NASA,SpaceX (for space)")
    print("   Example: NBA,ESPN,NFL (for sports)")
    accounts_input = input("   Accounts: ").strip()
    accounts = [a.strip().replace('@', '') for a in accounts_input.split(',') if a.strip()]
    
    # Get keywords (optional, for filtering)
    print("\n📝 Enter keywords to filter tweets (comma-separated, optional):")
    print("   These will filter the account tweets to only show matching content")
    print("   Example: playoffs, championship")
    keywords_input = input("   Keywords (press Enter to skip): ").strip()
    keywords = [k.strip() for k in keywords_input.split(',') if k.strip()]
    
    if not accounts and not keywords:
        print("❌ No accounts or keywords provided!")
        return None
    
    if not accounts and keywords:
        print("\n⚠️  WARNING: Keyword-only search may not find results")
        print("   Nitter keyword search is unreliable. Consider adding accounts!")
        choice = input("   Continue anyway? (y/n): ").strip().lower()
        if choice != 'y':
            return None
    
    # Get max results
    print("\n📊 Maximum tweets per keyword/account (default: 20):")
    max_input = input("   Max tweets: ").strip()
    max_tweets = int(max_input) if max_input.isdigit() else 20
    
    # Database name
    print("\n💾 Database filename (default: scraped_tweets.db):")
    db_input = input("   Filename: ").strip()
    db_name = db_input if db_input else "scraped_tweets.db"
    
    return {
        'keywords': keywords,
        'accounts': accounts,
        'max_tweets': max_tweets,
        'db_name': db_name
    }


def main():
    parser = argparse.ArgumentParser(
        description='Generic Twitter/X Scraper - Search ANY topics (Account scraping recommended)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples (RECOMMENDED - Account Scraping):
  # Interactive mode
  python generic_scraper.py

  # Scrape news accounts
  python generic_scraper.py -a "CNN,BBC,Reuters" -m 20

  # Scrape sports with keyword filter
  python generic_scraper.py -a "ESPN,NBA,NFL" -k "playoffs" -m 15

  # Scrape tech companies
  python generic_scraper.py -a "Apple,Google,Microsoft" -m 25

  # Use config file
  python generic_scraper.py -c search_config.json

NOTE: Account scraping (-a) is more reliable than keyword search (-k only).
      For best results, use accounts with optional keyword filtering.
        """
    )
    
    parser.add_argument('-k', '--keywords', type=str, 
                       help='Keywords to search (comma-separated)')
    parser.add_argument('-a', '--accounts', type=str,
                       help='Specific accounts to scrape (comma-separated)')
    parser.add_argument('-m', '--max-tweets', type=int, default=20,
                       help='Maximum tweets per keyword/account (default: 20)')
    parser.add_argument('-d', '--database', type=str, default='scraped_tweets.db',
                       help='Database filename (default: scraped_tweets.db)')
    parser.add_argument('-c', '--config', type=str,
                       help='Load configuration from JSON file')
    parser.add_argument('--no-display', action='store_true',
                       help='Don\'t display results (only save to database)')
    
    args = parser.parse_args()
    
    # Load config from file if provided
    config = load_config(args.config) if args.config else {}
    
    # Get parameters
    keywords = None
    accounts = None
    max_tweets = args.max_tweets
    db_name = args.database
    
    if config:
        keywords = config.get('keywords', [])
        accounts = config.get('accounts', [])
        max_tweets = config.get('max_tweets', max_tweets)
        db_name = config.get('database', db_name)
    elif args.keywords or args.accounts:
        keywords = [k.strip() for k in args.keywords.split(',') if k.strip()] if args.keywords else []
        accounts = [a.strip().replace('@', '') for a in args.accounts.split(',') if a.strip()] if args.accounts else []
    else:
        # Interactive mode
        params = interactive_mode()
        if not params:
            return
        keywords = params['keywords']
        accounts = params['accounts']
        max_tweets = params['max_tweets']
        db_name = params['db_name']
    
    if not keywords and not accounts:
        print("\n❌ No keywords or accounts specified!")
        print("   Use -a for accounts (recommended) or -k for keywords")
        print("   Run without args for interactive mode: python generic_scraper.py")
        return
    
    # Warn if only keywords provided
    if keywords and not accounts:
        print("\n⚠️  WARNING: Keyword-only search is unreliable on Nitter")
        print("   Recommendation: Add accounts with -a for better results")
        print("   Example: python generic_scraper.py -a 'CNN,BBC' -k 'your keywords'")
        print("\n   Continue with keyword-only search? (y/n): ", end='')
        import sys
        choice = sys.stdin.readline().strip().lower()
        if choice != 'y':
            print("   Cancelled. Try adding accounts for better results!")
            return
    
    print("\n" + "=" * 80)
    print("🚀 GENERIC TWITTER SCRAPER")
    print("=" * 80)
    
    if keywords:
        print(f"\n🔍 Keywords: {', '.join(keywords)}")
    if accounts:
        print(f"👥 Accounts: {', '.join(accounts)}")
    print(f"📊 Max tweets: {max_tweets}")
    print(f"💾 Database: {db_name}")
    
    # Nitter instances
    nitter_instances = [
        "https://nitter.net",
        "https://nitter.privacydev.net",
        "https://nitter.poast.org"
    ]
    
    all_tweets = []
    driver = None
    
    try:
        driver = setup_driver()
        logger.info("✅ Browser initialized")
        
        # Try nitter instances
        for nitter_url in nitter_instances:
            logger.info(f"\n🔄 Using: {nitter_url}")
            
            instance_works = True
            
            # Search by keywords
            if keywords:
                logger.info("\n🔍 Searching by keywords...")
                results = search_keywords_nitter(driver, nitter_url, keywords, max_tweets)
                
                if results is None:
                    instance_works = False
                elif results:
                    all_tweets.extend(results)
                    logger.info(f"✅ Found {len(results)} tweets from keyword search")
            
            # Scrape specific accounts
            if accounts and instance_works:
                logger.info(f"\n👥 Scraping {len(accounts)} accounts...")
                results = scrape_accounts(driver, nitter_url, accounts, max_tweets, keywords)
                
                if results is None:
                    instance_works = False
                elif results:
                    all_tweets.extend(results)
                    logger.info(f"✅ Found {len(results)} tweets from accounts")
            
            if instance_works and all_tweets:
                logger.info(f"\n✅ Successfully scraped using {nitter_url}")
                break
            
            if not instance_works:
                logger.warning(f"⚠️  Rate limited, trying next instance...")
        
        # Save to database
        if all_tweets:
            print("\n" + "=" * 80)
            save_to_database(all_tweets, db_name)
            
            # Display results
            if not args.no_display:
                display_results(all_tweets)
            
            print("\n" + "=" * 80)
            print("✅ SCRAPING COMPLETE!")
            print("=" * 80)
            print(f"📊 Total tweets: {len(all_tweets)}")
            print(f"💾 Database: {db_name}")
            print("=" * 80 + "\n")
        else:
            print("\n❌ No tweets collected. Possible reasons:")
            print("   • All Nitter instances are down or rate-limited")
            print("   • No results found for the specified keywords/accounts")
            print("   • Network connectivity issues")
            print("   • Try different keywords or try again later")
    
    finally:
        if driver:
            driver.quit()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()