import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import websockets
import psycopg2
from pymongo import MongoClient
import redis
from fastapi import FastAPI, WebSocket
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIAnalyticsEngine:
    """
    AI-powered analytics engine for API payment intelligence
    """
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        self.setup_database_connections()
        self.initialize_models()
        
    def setup_database_connections(self):
        """Setup database connections for data access"""
        try:
            # PostgreSQL connection for historical data
            self.pg_conn = psycopg2.connect(
                host="localhost",
                database="api_payments_analytics",
                user="postgres",
                password="password"
            )
            
            # MongoDB connection for flexible queries
            self.mongo_client = MongoClient('mongodb://localhost:27017/')
            self.mongo_db = self.mongo_client['api_payments_analytics']
            
            logger.info("✅ Database connections established")
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
    
    def initialize_models(self):
        """Initialize and load pre-trained AI models"""
        try:
            # Try to load existing models
            self.models['user_classifier'] = joblib.load('models/user_classifier.pkl')
            self.models['anomaly_detector'] = joblib.load('models/anomaly_detector.pkl')
            self.scalers['user_features'] = joblib.load('models/user_scaler.pkl')
            
            logger.info("✅ Pre-trained models loaded")
            
        except FileNotFoundError:
            # Initialize new models if none exist
            self.models['user_classifier'] = RandomForestClassifier(
                n_estimators=100, 
                random_state=42
            )
            self.models['anomaly_detector'] = IsolationForest(
                contamination=0.1, 
                random_state=42
            )
            self.scalers['user_features'] = StandardScaler()
            
            logger.info("🆕 New AI models initialized")
    
    async def process_payment_event(self, event_data: Dict):
        """Process real-time payment events from substreams"""
        try:
            # Extract features from event
            features = self.extract_features(event_data)
            
            # User behavior analysis
            user_insights = await self.analyze_user_behavior(features)
            
            # Anomaly detection
            anomaly_score = self.detect_anomalies(features)
            
            # Cost optimization
            cost_suggestions = await self.generate_cost_suggestions(features)
            
            # Combine insights
            ai_insights = {
                'timestamp': datetime.now().isoformat(),
                'user_insights': user_insights,
                'anomaly_score': anomaly_score,
                'cost_suggestions': cost_suggestions,
                'confidence_score': self.calculate_confidence(features)
            }
            
            # Cache results for fast access
            self.redis_client.setex(
                f"ai_insights:{features.get('user_address', 'unknown')}", 
                300, 
                json.dumps(ai_insights)
            )
            
            return ai_insights
            
        except Exception as e:
            logger.error(f"❌ Error processing payment event: {e}")
            return None
    
    def extract_features(self, event_data: Dict) -> Dict:
        """Extract ML features from payment event data"""
        features = {}
        
        try:
            # Basic payment features
            features['payment_amount'] = float(event_data.get('amount', 0))
            features['timestamp'] = event_data.get('timestamp', datetime.now().timestamp())
            features['user_address'] = event_data.get('user_address', '')
            features['provider_address'] = event_data.get('provider_address', '')
            
            # Time-based features
            dt = datetime.fromtimestamp(features['timestamp'])
            features['hour_of_day'] = dt.hour
            features['day_of_week'] = dt.weekday()
            features['is_weekend'] = dt.weekday() >= 5
            
            # Historical user data
            user_history = self.get_user_history(features['user_address'])
            features['total_payments'] = len(user_history)
            features['avg_payment_amount'] = np.mean([p['amount'] for p in user_history]) if user_history else 0
            features['payment_frequency'] = self.calculate_payment_frequency(user_history)
            features['provider_diversity'] = len(set([p['provider'] for p in user_history]))
            
            # Recent activity patterns
            recent_payments = [p for p in user_history if 
                             datetime.fromtimestamp(p['timestamp']) > datetime.now() - timedelta(days=7)]
            features['recent_payment_count'] = len(recent_payments)
            features['recent_payment_variance'] = np.var([p['amount'] for p in recent_payments]) if recent_payments else 0
            
            return features
            
        except Exception as e:
            logger.error(f"❌ Feature extraction failed: {e}")
            return {}
    
    async def analyze_user_behavior(self, features: Dict) -> Dict:
        """Analyze user behavior patterns using AI models"""
        try:
            # Prepare feature vector for ML model
            feature_vector = np.array([[
                features.get('payment_amount', 0),
                features.get('total_payments', 0),
                features.get('avg_payment_amount', 0),
                features.get('payment_frequency', 0),
                features.get('provider_diversity', 0),
                features.get('recent_payment_count', 0),
                features.get('hour_of_day', 12),
                features.get('day_of_week', 0),
                int(features.get('is_weekend', False))
            ]])
            
            # Scale features
            if hasattr(self.scalers['user_features'], 'transform'):
                feature_vector = self.scalers['user_features'].transform(feature_vector)
            
            # Predict user category
            if hasattr(self.models['user_classifier'], 'predict_proba'):
                user_category_proba = self.models['user_classifier'].predict_proba(feature_vector)[0]
                categories = ['power_user', 'regular_user', 'occasional_user', 'at_risk_user']
                user_category = categories[np.argmax(user_category_proba)]
                confidence = float(np.max(user_category_proba))
            else:
                user_category = 'regular_user'
                confidence = 0.5
            
            # Generate personalized insights
            insights = {
                'user_category': user_category,
                'confidence': confidence,
                'recommendations': self.generate_user_recommendations(features, user_category),
                'risk_score': self.calculate_risk_score(features),
                'efficiency_score': self.calculate_efficiency_score(features)
            }
            
            return insights
            
        except Exception as e:
            logger.error(f"❌ User behavior analysis failed: {e}")
            return {'user_category': 'unknown', 'confidence': 0.0, 'recommendations': []}
    
    def detect_anomalies(self, features: Dict) -> float:
        """Detect anomalies in payment patterns"""
        try:
            # Prepare feature vector
            anomaly_features = np.array([[
                features.get('payment_amount', 0),
                features.get('hour_of_day', 12),
                features.get('recent_payment_count', 0),
                features.get('recent_payment_variance', 0),
                features.get('payment_frequency', 0)
            ]])
            
            # Get anomaly score
            if hasattr(self.models['anomaly_detector'], 'decision_function'):
                anomaly_score = self.models['anomaly_detector'].decision_function(anomaly_features)[0]
                # Normalize score to 0-1 range (higher = more anomalous)
                normalized_score = max(0, min(1, (0.5 - anomaly_score) * 2))
            else:
                normalized_score = 0.1  # Default low anomaly score
            
            return float(normalized_score)
            
        except Exception as e:
            logger.error(f"❌ Anomaly detection failed: {e}")
            return 0.0
    
    async def generate_cost_suggestions(self, features: Dict) -> List[Dict]:
        """Generate AI-powered cost optimization suggestions"""
        suggestions = []
        
        try:
            payment_amount = features.get('payment_amount', 0)
            user_history = self.get_user_history(features.get('user_address', ''))
            
            # Batching suggestion
            if len(user_history) > 5:
                recent_payments = user_history[-5:]
                avg_amount = np.mean([p['amount'] for p in recent_payments])
                
                if payment_amount < avg_amount * 0.3:  # Small payment
                    suggestions.append({
                        'type': 'batch_optimization',
                        'description': f'Consider batching small payments. You could save ~15% on gas costs.',
                        'potential_savings_usd': payment_amount * 0.15,
                        'confidence': 0.8
                    })
            
            # Token optimization suggestion
            if payment_amount > 100:  # Larger payment
                suggestions.append({
                    'type': 'token_optimization',
                    'description': 'Use PYUSD for better liquidity and lower slippage on larger payments.',
                    'potential_savings_usd': payment_amount * 0.03,
                    'confidence': 0.7
                })
            
            # Timing optimization
            hour = features.get('hour_of_day', 12)
            if 9 <= hour <= 17:  # Peak hours
                suggestions.append({
                    'type': 'timing_optimization',
                    'description': 'Consider making payments during off-peak hours (6-9 PM) for lower gas costs.',
                    'potential_savings_usd': payment_amount * 0.05,
                    'confidence': 0.6
                })
            
            return suggestions
            
        except Exception as e:
            logger.error(f"❌ Cost suggestion generation failed: {e}")
            return []
    
    def generate_user_recommendations(self, features: Dict, user_category: str) -> List[str]:
        """Generate personalized recommendations based on user category"""
        recommendations = []
        
        try:
            if user_category == 'power_user':
                recommendations.extend([
                    "Consider our enterprise API packages for better rates",
                    "Your usage pattern is excellent - you're maximizing efficiency",
                    "Explore advanced features like batch processing"
                ])
            
            elif user_category == 'regular_user':
                recommendations.extend([
                    "Your payment pattern looks healthy",
                    "Consider setting up auto-deposits for convenience",
                    "Monitor your API usage to optimize costs"
                ])
            
            elif user_category == 'occasional_user':
                recommendations.extend([
                    "Set up low-balance alerts to avoid service interruptions",
                    "Consider prepaid packages for better rates",
                    "Your usage is efficient but could be more consistent"
                ])
            
            elif user_category == 'at_risk_user':
                recommendations.extend([
                    "Review your API usage to optimize costs",
                    "Consider switching to more cost-effective providers",
                    "Your payment pattern suggests potential inefficiencies"
                ])
            
            # Add specific recommendations based on features
            provider_diversity = features.get('provider_diversity', 0)
            if provider_diversity == 1:
                recommendations.append("Consider diversifying API providers for better reliability")
            
            payment_frequency = features.get('payment_frequency', 0)
            if payment_frequency > 10:  # Very frequent payments
                recommendations.append("Batch smaller payments to reduce transaction costs")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Recommendation generation failed: {e}")
            return ["Unable to generate recommendations at this time"]
    
    def calculate_risk_score(self, features: Dict) -> float:
        """Calculate user risk score based on payment patterns"""
        try:
            risk_score = 0.0
            
            # High-frequency, small payments (potential bot activity)
            payment_frequency = features.get('payment_frequency', 0)
            avg_amount = features.get('avg_payment_amount', 0)
            
            if payment_frequency > 20 and avg_amount < 10:
                risk_score += 0.3
            
            # Unusual timing patterns
            hour = features.get('hour_of_day', 12)
            if hour < 6 or hour > 22:  # Unusual hours
                risk_score += 0.2
            
            # High variance in payment amounts
            recent_variance = features.get('recent_payment_variance', 0)
            if recent_variance > 1000:  # High variance
                risk_score += 0.2
            
            # Single provider dependency
            provider_diversity = features.get('provider_diversity', 1)
            if provider_diversity == 1 and payment_frequency > 5:
                risk_score += 0.1
            
            return min(1.0, risk_score)
            
        except Exception as e:
            logger.error(f"❌ Risk score calculation failed: {e}")
            return 0.5
    
    def calculate_efficiency_score(self, features: Dict) -> float:
        """Calculate payment efficiency score"""
        try:
            efficiency_score = 1.0
            
            # Penalize very frequent small payments
            payment_frequency = features.get('payment_frequency', 0)
            avg_amount = features.get('avg_payment_amount', 0)
            
            if payment_frequency > 10 and avg_amount < 50:
                efficiency_score -= 0.3
            
            # Reward consistent payment patterns
            recent_variance = features.get('recent_payment_variance', 0)
            if recent_variance < 100:  # Low variance = consistent
                efficiency_score += 0.2
            
            # Reward provider diversification
            provider_diversity = features.get('provider_diversity', 1)
            if provider_diversity > 2:
                efficiency_score += 0.1
            
            return max(0.0, min(1.0, efficiency_score))
            
        except Exception as e:
            logger.error(f"❌ Efficiency score calculation failed: {e}")
            return 0.7
    
    def calculate_confidence(self, features: Dict) -> float:
        """Calculate confidence in AI predictions based on data quality"""
        try:
            confidence = 0.5  # Base confidence
            
            # More historical data = higher confidence
            total_payments = features.get('total_payments', 0)
            if total_payments > 10:
                confidence += 0.3
            elif total_payments > 5:
                confidence += 0.1
            
            # Recent activity = higher confidence
            recent_count = features.get('recent_payment_count', 0)
            if recent_count > 3:
                confidence += 0.2
            
            return min(1.0, confidence)
            
        except Exception as e:
            logger.error(f"❌ Confidence calculation failed: {e}")
            return 0.5
    
    def calculate_payment_frequency(self, user_history: List[Dict]) -> float:
        """Calculate payment frequency (payments per day)"""
        try:
            if len(user_history) < 2:
                return 0.0
            
            timestamps = [p['timestamp'] for p in user_history]
            time_span = max(timestamps) - min(timestamps)
            days = time_span / (24 * 3600) if time_span > 0 else 1
            
            return len(user_history) / days
            
        except Exception as e:
            logger.error(f"❌ Payment frequency calculation failed: {e}")
            return 0.0
    
    def get_user_history(self, user_address: str) -> List[Dict]:
        """Get user payment history from database"""
        try:
            # Try Redis cache first
            cached_history = self.redis_client.get(f"user_history:{user_address}")
            if cached_history:
                return json.loads(cached_history)
            
            # Query PostgreSQL for historical data
            cursor = self.pg_conn.cursor()
            cursor.execute("""
                SELECT payment_amount, timestamp, provider_address
                FROM payment_analytics 
                WHERE user_address = %s 
                ORDER BY timestamp DESC 
                LIMIT 100
            """, (user_address,))
            
            history = []
            for row in cursor.fetchall():
                history.append({
                    'amount': float(row[0]),
                    'timestamp': row[1].timestamp(),
                    'provider': str(row[2])
                })
            
            # Cache for 5 minutes
            self.redis_client.setex(
                f"user_history:{user_address}", 
                300, 
                json.dumps(history)
            )
            
            return history
            
        except Exception as e:
            logger.error(f"❌ User history retrieval failed: {e}")
            return []
    
    async def train_models(self):
        """Train AI models on historical data"""
        try:
            logger.info("🎓 Starting AI model training...")
            
            # Load training data from PostgreSQL
            query = """
                SELECT 
                    payment_amount, total_payments, avg_payment_amount,
                    payment_frequency, provider_diversity, hour_of_day,
                    day_of_week, is_weekend, user_category
                FROM user_training_data
                WHERE created_at > NOW() - INTERVAL '30 days'
            """
            
            training_data = pd.read_sql(query, self.pg_conn)
            
            if len(training_data) < 100:
                logger.warning("⚠️  Insufficient training data. Using synthetic data.")
                training_data = self.generate_synthetic_training_data()
            
            # Prepare features and labels
            feature_columns = [
                'payment_amount', 'total_payments', 'avg_payment_amount',
                'payment_frequency', 'provider_diversity', 'hour_of_day',
                'day_of_week', 'is_weekend'
            ]
            
            X = training_data[feature_columns].values
            y = training_data['user_category'].values if 'user_category' in training_data.columns else None
            
            # Scale features
            X_scaled = self.scalers['user_features'].fit_transform(X)
            
            # Train user classifier
            if y is not None:
                X_train, X_test, y_train, y_test = train_test_split(
                    X_scaled, y, test_size=0.2, random_state=42
                )
                
                self.models['user_classifier'].fit(X_train, y_train)
                accuracy = self.models['user_classifier'].score(X_test, y_test)
                logger.info(f"✅ User classifier trained with {accuracy:.2f} accuracy")
            
            # Train anomaly detector
            self.models['anomaly_detector'].fit(X_scaled)
            logger.info("✅ Anomaly detector trained")
            
            # Save models
            import os
            os.makedirs('models', exist_ok=True)
            joblib.dump(self.models['user_classifier'], 'models/user_classifier.pkl')
            joblib.dump(self.models['anomaly_detector'], 'models/anomaly_detector.pkl')
            joblib.dump(self.scalers['user_features'], 'models/user_scaler.pkl')
            
            logger.info("💾 Models saved successfully")
            
        except Exception as e:
            logger.error(f"❌ Model training failed: {e}")
    
    def generate_synthetic_training_data(self) -> pd.DataFrame:
        """Generate synthetic training data for initial model development"""
        np.random.seed(42)
        n_samples = 1000
        
        data = {
            'payment_amount': np.random.lognormal(4, 1, n_samples),
            'total_payments': np.random.poisson(10, n_samples),
            'avg_payment_amount': np.random.lognormal(3.5, 0.8, n_samples),
            'payment_frequency': np.random.exponential(2, n_samples),
            'provider_diversity': np.random.poisson(2, n_samples) + 1,
            'hour_of_day': np.random.normal(14, 4, n_samples) % 24,
            'day_of_week': np.random.randint(0, 7, n_samples),
            'is_weekend': np.random.choice([0, 1], n_samples, p=[0.7, 0.3])
        }
        
        # Generate labels based on patterns
        labels = []
        for i in range(n_samples):
            if data['total_payments'][i] > 50 and data['payment_frequency'][i] > 5:
                labels.append('power_user')
            elif data['total_payments'][i] < 5 or data['payment_frequency'][i] < 0.5:
                labels.append('occasional_user')
            elif data['avg_payment_amount'][i] < 10 and data['payment_frequency'][i] > 10:
                labels.append('at_risk_user')
            else:
                labels.append('regular_user')
        
        data['user_category'] = labels
        return pd.DataFrame(data)

# FastAPI app for serving AI insights
app = FastAPI(title="AI Analytics Engine", version="1.0.0")
ai_engine = AIAnalyticsEngine()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/analyze")
async def analyze_payment(event_data: dict):
    """Analyze a payment event and return AI insights"""
    insights = await ai_engine.process_payment_event(event_data)
    return insights

@app.get("/user/{user_address}")
async def get_user_insights(user_address: str):
    """Get cached insights for a specific user"""
    cached_insights = ai_engine.redis_client.get(f"ai_insights:{user_address}")
    if cached_insights:
        return json.loads(cached_insights)
    return {"message": "No insights available for this user"}

@app.post("/train")
async def train_models():
    """Trigger model training"""
    await ai_engine.train_models()
    return {"message": "Model training completed"}

if __name__ == "__main__":
    logger.info("🚀 Starting AI Analytics Engine...")
    uvicorn.run(app, host="0.0.0.0", port=8000)