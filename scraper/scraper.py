#!/usr/bin/env python3
"""
Fast crypto tweet scraper using Nitter - optimized version
"""

import time
import logging
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from datetime import datetime
import sqlite3
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

def setup_driver():
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)

def scrape_account(driver, nitter_url, account):
    """Scrape tweets from one account"""
    url = f"{nitter_url}/{account}"
    logger.info(f"   📱 Scraping @{account}...")
    
    try:
        driver.get(url)
        time.sleep(3)
        
        # Check for rate limit
        if 'rate limited' in driver.page_source.lower():
            return None  # Signal to try next instance
        
        tweets = driver.find_elements(By.CSS_SELECTOR, '.timeline-item')
        results = []
        
        for tweet in tweets[:15]:  # Get top 15 tweets
            try:
                text_elem = tweet.find_element(By.CSS_SELECTOR, '.tweet-content')
                time_elem = tweet.find_element(By.CSS_SELECTOR, '.tweet-date a')
                stats = tweet.find_elements(By.CSS_SELECTOR, '.icon-container')
                
                # Extract engagement stats
                likes = retweets = replies = "0"
                try:
                    if len(stats) >= 3:
                        replies = stats[0].text.strip() or "0"
                        retweets = stats[1].text.strip() or "0"
                        likes = stats[2].text.strip() or "0"
                except:
                    pass
                
                tweet_text = text_elem.text.strip()
                tweet_time = time_elem.get_attribute('title') or time_elem.text
                
                # Check if market-moving content
                market_keywords = [
                    # Core crypto
                    'btc', 'bitcoin', 'eth', 'ethereum', 'crypto', 'defi', 'web3', 'blockchain',
                    'nft', 'solana', 'token', 'coin', 'trading', 'bull', 'bear', 'hodl', 'dex', 'dao',
                    'stablecoin', 'cbdc', 'digital currency',
                    
                    # Political (global)
                    'election', 'vote', 'voting', 'ballots', 'results', 'landslide', 'runoff',
                    'incumbent', 'opposition', 'regime change', 'coup', 'instability', 'martial law',
                    'emergency powers', 'authoritarian', 'democracy', 'republic', 'parliament',
                    'congress', 'senate', 'house', 'judiciary', 'supreme court', 'constitutional',
                    'amendment', 'executive order', 'decree',
                    
                    # Regulatory & legal (very high impact)
                    'regulation', 'regulated', 'unregulated', 'ban', 'banned', 'illegal', 'legal',
                    'legality', 'compliance', 'compliant', 'noncompliant', 'enforcement',
                    'investigation', 'probe', 'subpoena', 'lawsuit', 'sued', 'settlement',
                    'fine', 'penalty', 'charges', 'indictment', 'arrest', 'extradition',
                    'warrant', 'trial', 'appeal', 'ruling', 'verdict',
                    
                    # US-specific political/legal
                    'sec', 'cftc', 'doj', 'treasury', 'irs', 'federal reserve', 'fed',
                    'fomc', 'white house', 'ofac', 'patriot act', 'aml', 'kyc', 'travel rule',
                    'stablecoin bill', 'crypto bill', 'infrastructure bill', 'tax bill',
                    'capital gains', 'unrealized gains',
                    
                    # Global regulators
                    'imf', 'world bank', 'bis', 'fatf', 'ecb', 'esma', 'mica', 'g7', 'g20',
                    'wto', 'un', 'bank of england', 'pboc', 'rbi', 'sebi', 'mas', 'hkma', 'sfc',
                    
                    # Geopolitics & conflict
                    'war', 'conflict', 'invasion', 'military action', 'escalation', 'deescalation',
                    'ceasefire', 'sanctions', 'embargo', 'trade war', 'tariffs', 'blockade',
                    'cyberwar', 'cyberattack', 'terrorism', 'retaliation', 'strike', 'missile',
                    'defense spending',
                    
                    # Macroeconomic
                    'interest rates', 'rate hike', 'rate cut', 'pause', 'inflation', 'cpi', 'ppi',
                    'unemployment', 'jobs report', 'nfp', 'gdp', 'recession', 'depression',
                    'soft landing', 'hard landing', 'liquidity', 'quantitative easing', 'qe',
                    'quantitative tightening', 'qt', 'money supply', 'm2', 'debt ceiling', 'default',
                    
                    # Fiscal/monetary policy
                    'stimulus', 'bailout', 'fiscal spending', 'austerity', 'deficit', 'surplus',
                    'bond yields', 'treasury yields', 'dollar strength', 'dxy', 'currency devaluation',
                    'printing money', 'money printer', 'liquidity injection',
                    
                    # Political figures
                    'president', 'prime minister', 'chancellor', 'finance minister', 'treasury secretary',
                    'central bank chair', 'fed chair', 'sec chair', 'senator', 'congressman', 'mp',
                    'head of state',
                    
                    # Country-specific triggers
                    'usa', 'china', 'russia', 'ukraine', 'israel', 'palestine', 'iran', 'india',
                    'eu', 'uk', 'germany', 'france', 'japan', 'south korea', 'taiwan', 'hong kong',
                    'singapore', 'el salvador', 'argentina', 'venezuela', 'nigeria', 'turkey',
                    
                    # Sanctions & capital control
                    'frozen assets', 'asset seizure', 'capital controls', 'bank freeze', 'swift ban',
                    'cross-border payments', 'remittance restrictions',
                    
                    # Banking system stress
                    'bank failure', 'bank run', 'insolvency', 'liquidity crisis', 'credit crunch',
                    'systemic risk', 'deposit freeze', 'withdrawal limits',
                    
                    # Crypto-policy specific
                    'cbdc', 'central bank digital currency', 'digital dollar', 'digital yuan',
                    'digital euro', 'reserve backing', 'proof of reserves', 'custodial risk',
                    'self custody', 'wallet ban', 'privacy coins', 'mixer ban',
                    
                    # Election-season crypto
                    'pro-crypto', 'anti-crypto', 'crypto donations', 'campaign funding', 'lobbying',
                    'pac', 'political donations', 'crypto voter',
                    
                    # Media & narrative signals
                    'breaking', 'urgent', 'exclusive', 'leaked', 'sources say', 'anonymous sources',
                    'insider', 'whistleblower', 'report claims', 'developing story', 'confirmed',
                    'denied', 'retracted',
                    
                    # Market psychology
                    'panic', 'uncertainty', 'fear', 'risk-off', 'risk-on', 'capital flight',
                    'hedge', 'safe haven', 'volatility spike',
                    
                    # Institutional power players
                    'blackrock', 'vanguard', 'fidelity', 'goldman sachs', 'jpmorgan', 'citadel',
                    'microstrategy', 'tesla', 'sovereign wealth fund', 'pension fund',
                ]
                
                text_lower = tweet_text.lower()
                is_crypto = any(keyword in text_lower for keyword in market_keywords)
                
                results.append({
                    'username': account,
                    'text': tweet_text,
                    'time': tweet_time,
                    'likes': likes,
                    'retweets': retweets,
                    'replies': replies,
                    'is_crypto': is_crypto,
                    'scraped_at': datetime.now().isoformat()
                })
                
            except Exception as e:
                continue
        
        logger.info(f"   ✅ Found {len(results)} tweets ({sum(1 for t in results if t['is_crypto'])} crypto-related)")
        return results
        
    except Exception as e:
        logger.error(f"   ❌ Error: {str(e)[:50]}")
        return []

def main():
    print("\n" + "=" * 80)
    print("🚀 FAST CRYPTO TWITTER SCRAPER (SELENIUM + NITTER)")
    print("=" * 80)
    
    # TIER-0: Market-moving individuals + comprehensive account list
    accounts = [
        # TIER-0 (MARKET-MOVING INDIVIDUALS)
        'elonmusk',
        'VitalikButerin',
        'saylor',
        'cz_binance',
        'balajis',
        'APompliano',
        'lexfridman',
        'naval',
        'jack',
        'brian_armstrong',
        'jespow',
        
        # US POLITICS / REGULATORS
        'WhiteHouse',
        'POTUS',
        'USTreasury',
        'federalreserve',
        'SECgov',
        'CFTC',
        'DOJCrimDiv',
        'IRSnews',
        'GaryGensler',
        'SecYellen',
        'fomc_alerts',
        
        # GLOBAL REGULATORS / CENTRAL BANKS
        'IMFNews',
        'worldbank',
        'BIS_org',
        'FATFNews',
        'ecb',
        'bankofengland',
        'ecb_press',
        'PBOC',
        'RBI',
        'SEBI_India',
        'MAS_sg',
        'EU_Commission',
        'Europarl_EN',
        
        # GEOPOLITICS / WAR / MACRO NARRATIVES
        'Reuters',
        'business',
        'WSJ',
        'FT',
        'TheEconomist',
        'politico',
        'axios',
        'BloombergTV',
        'Breakingviews',
        'zerohedge',
        
        # INSTITUTIONAL / WALL STREET
        'BlackRock',
        'Vanguard_Group',
        'Fidelity',
        'GoldmanSachs',
        'jpmorgan',
        'MorganStanley',
        'Citadel',
        'RayDalio',
        'howardmarks',
        
        # EXCHANGES (LISTINGS, HALTS, DUMPS)
        'binance',
        'coinbase',
        'krakenfx',
        'okx',
        'bitfinex',
        'kucoincom',
        'bybit_official',
        'Gate_io',
        'HuobiGlobal',
        
        # ON-CHAIN / WHALE / FLOW TRACKERS
        'whale_alert',
        'lookonchain',
        'ArkhamIntel',
        'glassnode',
        'santimentfeed',
        'cryptoquant_com',
        'intotheblock',
        
        # CRYPTO NEWS (BREAKING = VOLATILITY)
        'CoinDesk',
        'Cointelegraph',
        'TheBlock__',
        'DecryptMedia',
        'WatcherGuru',
        'WuBlockchain',
        'CryptoSlate',
        'bitcoinmagazine',
        
        # LEGAL / ENFORCEMENT
        'law360',
        'USCourts',
        'SCOTUSblog',
        'JusticeOIG',
        'FBI',
        'Europol',
        
        # POLITICAL FIGURES (MOVES MARKETS)
        'realDonaldTrump',
        'JoeBiden',
        'RishiSunak',
        'narendramodi',
        'vonderleyen',
        'EmmanuelMacron',
        'OlafScholz',
        'ZelenskyyUa',
        'netanyahu',
        
        # MACRO / RISK / SENTIMENT
        'LynAldenContact',
        'RaoulGMI',
        'RealVision',
        'MacroAlf',
        'jsblokland',
        'financialjuice',
        
        # NARRATIVE / EARLY SIGNALS
        'unusual_whales',
        'firstsquawk',
        'spectatorindex',
        'intelcrab',
        'LiveSquawk',
        'MarketsToday',
        
        # EMERGENCY / BLACK SWAN
        'Breaking911',
        'BNONews',
        'disclosetv',
        'alertchannel',
        'war_monitor',
        'conflict_news',
        
        # PROTOCOL / CORE CRYPTO
        'ethereum',
        'Bitcoin',
        'Solana',
        'Ripple',
        'Cardano',
        'StellarOrg',
        'Polkadot',
        'chainlink',
        'aaveaave',
        'Uniswap',
    ]
    
    # Nitter instances (Twitter frontends)
    nitter_instances = [
        "https://nitter.net",
        "https://nitter.privacydev.net",
        "https://nitter.poast.org"
    ]
    
    all_tweets = []
    driver = None
    
    try:
        driver = setup_driver()
        logger.info("✅ Browser initialized\n")
        
        # Try nitter instances
        for nitter_url in nitter_instances:
            logger.info(f"🔄 Trying: {nitter_url}")
            
            instance_works = True
            for account in accounts:
                result = scrape_account(driver, nitter_url, account)
                
                if result is None:  # Rate limited
                    logger.warning(f"   ⚠️  Rate limited, trying next instance...")
                    instance_works = False
                    break
                
                all_tweets.extend(result)
                time.sleep(1)
            
            if instance_works and all_tweets:
                logger.info(f"\n✅ Successfully scraped using {nitter_url}\n")
                break
        
        # Save to database
        if all_tweets:
            print("=" * 80)
            print(f"💾 Saving {len(all_tweets)} tweets to database...")
            
            import os
            db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'crypto_tweets.db')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tweets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT,
                    text TEXT,
                    time TEXT,
                    likes TEXT,
                    retweets TEXT,
                    replies TEXT,
                    is_crypto BOOLEAN,
                    scraped_at TEXT
                )
            ''')
            
            for tweet in all_tweets:
                cursor.execute('''
                    INSERT INTO tweets (username, text, time, likes, retweets, replies, is_crypto, scraped_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    tweet['username'],
                    tweet['text'],
                    tweet['time'],
                    tweet['likes'],
                    tweet['retweets'],
                    tweet['replies'],
                    tweet['is_crypto'],
                    tweet['scraped_at']
                ))
            
            conn.commit()
            conn.close()
            
            print(f"✅ Saved to crypto_tweets.db\n")
            
            # Display crypto-related tweets
            crypto_tweets = [t for t in all_tweets if t['is_crypto']]
            print("=" * 80)
            print(f"🎯 WEB3/CRYPTO RELATED TWEETS ({len(crypto_tweets)} found)")
            print("=" * 80)
            
            for i, tweet in enumerate(crypto_tweets[:20], 1):  # Show top 20
                print(f"\n#{i} - @{tweet['username']}")
                print(f"📅 {tweet['time']}")
                print(f"💬 {tweet['text'][:250]}")
                if len(tweet['text']) > 250:
                    print(f"   ... (truncated)")
                print(f"❤️  {tweet['likes']} | 🔄 {tweet['retweets']} | 💭 {tweet['replies']}")
                print("─" * 80)
            
            if len(crypto_tweets) > 20:
                print(f"\n... and {len(crypto_tweets) - 20} more crypto tweets in database")
            
        else:
            print("\n❌ No tweets collected. All Nitter instances may be down.")
            print("   Try again in a few minutes.")
    
    finally:
        if driver:
            driver.quit()
    
    print("\n" + "=" * 80)
    print("✅ COMPLETE!")
    print("=" * 80)
    print(f"📊 Total tweets: {len(all_tweets)}")
    print(f"🎯 Crypto-related: {sum(1 for t in all_tweets if t['is_crypto'])}")
    print(f"💾 Database: crypto_tweets.db")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()