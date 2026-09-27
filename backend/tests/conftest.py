import os

# Set before any application module is imported. Never use this key in deployment.
os.environ.setdefault('SECRET_KEY', 'local-test-signing-key-not-for-production-123')
