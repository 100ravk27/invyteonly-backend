function requireAuth(req, res, next) {
    console.log('🔐 [requireAuth] Checking authentication...');
    console.log('🔐 [requireAuth] Session exists:', !!req.session);
    console.log('🔐 [requireAuth] Session ID:', req.session?.id || 'N/A');
    console.log('🔐 [requireAuth] Session userId:', req.session?.userId || 'N/A');
    console.log('🔐 [requireAuth] Full session:', JSON.stringify(req.session || {}, null, 2));
    console.log('🔐 [requireAuth] Request headers:', {
      cookie: req.headers.cookie,
      'user-agent': req.headers['user-agent']
    });
    
    if (!req.session || !req.session.userId) {
      console.error('❌ [requireAuth] Unauthorized - Missing session or userId');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('✅ [requireAuth] Authentication successful, userId:', req.session.userId);
    req.userId = req.session.userId;
    next();
  }
  
  module.exports = { requireAuth };
  