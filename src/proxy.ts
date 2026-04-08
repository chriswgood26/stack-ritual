import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])
const isPublicApiRoute = createRouteMatcher(['/api/cron/(.*)', '/api/sms/webhook', '/api/sms/done', '/api/track', '/api/affiliates/interest', '/done'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicApiRoute(req)) return; // skip auth for cron, webhooks, done page
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
