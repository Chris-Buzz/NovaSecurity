# 🚀 Deployment Checklist

## Pre-Deployment (Local Testing)

- [x] All game modes working correctly
- [x] Phone call scenarios load and display
- [x] Audio generation working with ElevenLabs
- [x] Points tracking accurate
- [x] Responsive design tested
- [x] No console errors
- [x] Environment variables configured

## GitHub Setup

### Step 1: Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Nova Security cybersecurity training platform"
```

### Step 2: Create GitHub Repository
1. Go to https://github.com/new
2. Create repository named `nova-security`
3. Do NOT initialize with README (we already have one)
4. Click "Create repository"

### Step 3: Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/nova-security.git
git branch -M main
git push -u origin main
```

## Vercel Deployment

### Step 1: Connect GitHub to Vercel
1. Go to https://vercel.com
2. Sign up or login with GitHub
3. Click "Import Project"
4. Select your `nova-security` repository

### Step 2: Configure Environment Variables
In Vercel dashboard, add:
- `GEMINI_API_KEY` = Your Google Gemini API key
- `ELEVENLABS_API_KEY` = Your ElevenLabs API key

### Step 3: Deploy
Vercel will automatically:
- Install dependencies
- Build the project
- Deploy to production

Your app will be available at: `https://nova-security.vercel.app`

## Post-Deployment Testing

- [ ] Frontend loads at root URL
- [ ] Static files load (CSS, JS)
- [ ] API endpoints respond
- [ ] Phone call scenarios work
- [ ] Audio generation works
- [ ] Game state persists
- [ ] Mobile responsive
- [ ] No 404 errors

## Production Optimizations

### Already Implemented
✅ Static file caching headers in vercel.json
✅ Lambda timeout set to 30 seconds
✅ Memory allocation optimized (1024 MB)
✅ Python 3.11 runtime
✅ WSGI handler for production

### Optional Future Improvements
- [ ] Add CDN for static assets
- [ ] Implement rate limiting on API
- [ ] Add error tracking (Sentry)
- [ ] Set up monitoring/alerting
- [ ] Add database for scores (MongoDB, PostgreSQL)
- [ ] Implement user authentication

## Troubleshooting

### Issue: "Module not found" errors
**Solution:** Ensure `requirements.txt` has all dependencies and `pip install -r requirements.txt` runs successfully locally

### Issue: "API key not working"
**Solution:** 
- Verify API keys are set in Vercel environment
- Check API key permissions and quotas
- Ensure keys haven't expired

### Issue: Static files returning 404
**Solution:**
- Verify `templates/` and `static/` folders exist
- Check vercel.json routes configuration
- Ensure all static file paths are relative

### Issue: Audio not playing
**Solution:**
- Check browser console for errors
- Verify ElevenLabs API key is valid
- Check audio CORS headers
- Test with fallback speech synthesis

### Issue: Game state not persisting
**Solution:**
- Verify LocalStorage is enabled in browser
- Check browser storage quota
- Test in private/incognito mode

## Monitoring After Deployment

### Key Metrics to Track
1. **Performance**: Page load time < 3 seconds
2. **Availability**: 99.9% uptime
3. **Errors**: Monitor 5xx errors in Vercel logs
4. **API Usage**: Track ElevenLabs and Gemini API usage

### View Logs
```bash
vercel logs [deployment-url]
```

## Updating Deployment

### To Deploy New Changes
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Vercel will automatically redeploy when you push to main branch.

### To Rollback
In Vercel dashboard:
1. Go to Deployments
2. Click "Promote to Production" on the previous deployment

## Security Checklist

- [x] .env file in .gitignore (secrets not committed)
- [x] CORS properly configured
- [x] Input validation on all endpoints
- [x] API keys stored securely in Vercel
- [x] HTTPS enforced
- [x] No hardcoded credentials in code

## Domain Setup (Optional)

To use a custom domain:
1. In Vercel dashboard, go to Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. HTTPS certificate automatically issued

## Performance Metrics Target

- Page Load Time: < 2s
- API Response: < 500ms
- Audio Generation: < 2s
- Lighthouse Score: > 90

## Support & Maintenance

- Monitor Vercel dashboard weekly
- Check logs for errors
- Update dependencies monthly
- Review API usage and costs
- Backup any user data if added

---

**Deployment Status:** ✅ Ready for Production
**Last Updated:** November 2025
**Next Review:** December 2025
