import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import prisma from './prisma.js';
import { getDefaultRoleId } from '../services/bootstrapService.js';

const oauthUserInclude = {
  role: true,
};

// --- Strategy Google ---
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error('No email found from Google'), null);
        }

        let user = await prisma.user.findFirst({
          where: {
            OR: [{ googleId: profile.id }, { email }],
          },
          include: oauthUserInclude,
        });

        if (user && !user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: profile.id, avatar: profile.photos?.[0]?.value || user.avatar },
            include: oauthUserInclude,
          });
        }

        if (!user) {
          const roleId = await getDefaultRoleId();
          user = await prisma.user.create({
            data: {
              googleId: profile.id,
              email,
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value || null,
              roleId,
            },
            include: oauthUserInclude,
          });
        }

        if (user && !user.role) {
          const roleId = await getDefaultRoleId();
          user = await prisma.user.update({
            where: { id: user.id },
            data: { roleId },
            include: oauthUserInclude,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// --- Strategy Github ---
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ['user:email'],
    },
    async (accessToken, _refreshToken, profile, done) => {
      try {
        let email = profile.emails?.[0]?.value;

        if (!email) {
          const res = await fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `token ${accessToken}` },
          });
          const emails = await res.json();
          if (Array.isArray(emails)) {
            const primary = emails.find(e => e.primary && e.verified);
            email = primary?.email;
          }
        }

        if (!email) {
          email = `${profile.username}@users.noreply.github.com`;
        }

        let user = await prisma.user.findFirst({
          where: {
            OR: [{ githubId: profile.id }, { email }]
          },
          include: oauthUserInclude,
        });

        if (user && !user.githubId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { githubId: profile.id, avatar: profile.photos?.[0]?.value || user.avatar },
            include: oauthUserInclude,
          });
        }

        if (!user) {
          const roleId = await getDefaultRoleId();
          user = await prisma.user.create({
            data: {
              githubId: profile.id,
              email: email,
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value || null,
              roleId,
            },
            include: oauthUserInclude,
          });
        }

        if (user && !user.role) {
          const roleId = await getDefaultRoleId();
          user = await prisma.user.update({
            where: { id: user.id },
            data: { roleId },
            include: oauthUserInclude,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export default passport;
