import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { 
  insertUserSchema, 
  insertTeamSchema, 
  insertChallengeSchema, 
  insertCategorySchema,
  insertSubmissionSchema,
  insertHintUnlockSchema,
  insertTeamJoinRequestSchema,
  insertUsersDuelStatsSchema,
  insertDuelQueueSchema,
  insertDuelChallengeSchema,
  insertDuelMatchSchema
} from "@shared/schema";
export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "cyber-ctf-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
      store: storage.sessionStore,
    })
  );

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          const user = await storage.getUserByUsername(username);
          if (!user) {
            return done(null, false, { message: "Incorrect username." });
          }

          const match = await bcrypt.compare(password, user.password);
          if (!match) {
            return done(null, false, { message: "Incorrect password." });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize/deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Middleware to check if user is admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && (req.user as any).isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  // API routes - prefix all with /api
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken." });
      }
      
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use." });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
        return res.status(200).json({ user: userWithoutPassword });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.status(200).json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, (req, res) => {
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as any;
    res.status(200).json(userWithoutPassword);
  });

  // User routes
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.listUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Only allow updates to own profile or if admin
      if (userId !== currentUser.id && !currentUser.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Validate fields that can be updated
      const updateSchema = z.object({
        bio: z.string().optional(),
        email: z.string().email().optional(),
        avatarColor: z.string().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Update user
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Team routes
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Check if user is already in a team
      if (currentUser.teamId) {
        return res.status(400).json({ message: "You are already in a team" });
      }
      
      const teamData = {
        ...req.body,
        captainId: currentUser.id
      };
      
      const validatedData = insertTeamSchema.parse(teamData);
      
      // Check if team name already exists
      const existingTeam = await storage.getTeamByName(validatedData.name);
      if (existingTeam) {
        return res.status(400).json({ message: "Team name already taken" });
      }
      
      // Create team
      const newTeam = await storage.createTeam(validatedData);
      
      // Add creator to team
      await storage.updateUser(currentUser.id, { teamId: newTeam.id });
      
      res.status(201).json(newTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const teams = await storage.listTeams();
      res.status(200).json(teams);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.status(200).json(team);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/teams/:id/members", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const members = await storage.getTeamMembers(teamId);
      
      // Remove passwords from response
      const membersWithoutPasswords = members.map(({ password, ...memberWithoutPassword }) => memberWithoutPassword);
      
      res.status(200).json(membersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Get team
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Check if user is team captain
      if (team.captainId !== currentUser.id && !currentUser.isAdmin) {
        return res.status(403).json({ message: "Only team captain can update team" });
      }
      
      // Validate update data
      const updateSchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // If changing name, check if it's already taken
      if (validatedData.name && validatedData.name !== team.name) {
        const existingTeam = await storage.getTeamByName(validatedData.name);
        if (existingTeam) {
          return res.status(400).json({ message: "Team name already taken" });
        }
      }
      
      // Update team
      const updatedTeam = await storage.updateTeam(teamId, validatedData);
      
      res.status(200).json(updatedTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/teams/:id/join", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Get team
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Si el usuario ya tiene un equipo, lo cambiamos directamente al equipo nuevo
      if (currentUser.teamId) {
        // Actualizar usuario directamente para cambiarlo de equipo
        const updatedUser = await storage.updateUser(currentUser.id, { teamId });
        
        return res.status(200).json({
          message: "You have joined the team directly",
          user: updatedUser
        });
      }
      
      // Unirse directamente al equipo sin solicitar permiso
      const updatedUser = await storage.updateUser(currentUser.id, { teamId });
      
      res.status(200).json({
        message: "You have joined the team",
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/teams/join-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Get status from request
      const statusSchema = z.object({
        status: z.enum(["accepted", "rejected"])
      });
      
      const { status } = statusSchema.parse(req.body);
      
      // Update request
      const request = await storage.updateTeamJoinRequest(requestId, status);
      
      if (!request) {
        return res.status(404).json({ message: "Join request not found" });
      }
      
      // Get team
      const team = await storage.getTeam(request.teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Check if user is team captain
      if (team.captainId !== currentUser.id && !currentUser.isAdmin) {
        return res.status(403).json({ message: "Only team captain can process join requests" });
      }
      
      // If accepted, add user to team
      if (status === "accepted") {
        await storage.updateUser(request.userId, { teamId: team.id });
      }
      
      res.status(200).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/teams/join-requests/team/:teamId", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const currentUser = req.user as any;
      
      // Get team
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Check if user is team captain
      if (team.captainId !== currentUser.id && !currentUser.isAdmin) {
        return res.status(403).json({ message: "Only team captain can view join requests" });
      }
      
      // Get requests
      const requests = await storage.getTeamJoinRequests(teamId);
      
      res.status(200).json(requests);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/teams/:id/leave", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Check if user is in this team
      if (currentUser.teamId !== teamId) {
        return res.status(400).json({ message: "You are not in this team" });
      }
      
      // Get team
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // If user is captain, they can't leave unless they're the only member
      if (team.captainId === currentUser.id) {
        const members = await storage.getTeamMembers(teamId);
        
        if (members.length > 1) {
          return res.status(400).json({ message: "Team captain cannot leave. Transfer captaincy first or disband the team." });
        }
        
        // Last member, delete team
        await storage.deleteTeam(teamId);
      }
      
      // Remove user from team
      await storage.updateUser(currentUser.id, { teamId: null });
      
      res.status(200).json({ message: "Left team successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Challenge routes
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.listCategories();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/challenges", isAuthenticated, async (req, res) => {
    try {
      const challenges = await storage.listChallenges();
      const currentUser = req.user as any;
      
      // For each challenge, check if the user or their team has solved it
      const enrichedChallenges = await Promise.all(
        challenges.map(async (challenge) => {
          const { flag, ...challengeWithoutFlag } = challenge; // Don't send the flag to client
          
          const userSolved = await storage.isChallengeCompletedByUser(currentUser.id, challenge.id);
          let teamSolved = false;
          
          if (currentUser.teamId) {
            teamSolved = await storage.isChallengeCompletedByTeam(currentUser.teamId, challenge.id);
          }
          
          // Get the category for the challenge
          const category = await storage.getCategory(challenge.categoryId);
          
          // Get number of solves
          const solves = (await storage.listSubmissionsByChallenge(challenge.id)).length;
          
          return {
            ...challengeWithoutFlag,
            solved: userSolved || teamSolved,
            category: category || { name: "Unknown", color: "#808080" },
            solves
          };
        })
      );
      
      res.status(200).json(enrichedChallenges);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/challenges/:id", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      const challenge = await storage.getChallenge(challengeId);
      
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      const currentUser = req.user as any;
      
      // Check if the user or their team has solved it
      const userSolved = await storage.isChallengeCompletedByUser(currentUser.id, challenge.id);
      let teamSolved = false;
      
      if (currentUser.teamId) {
        teamSolved = await storage.isChallengeCompletedByTeam(currentUser.teamId, challenge.id);
      }
      
      // Check if hint is unlocked
      const hintUnlocked = await storage.isHintUnlockedByUser(currentUser.id, challenge.id) || 
                           (currentUser.teamId ? await storage.isHintUnlockedByTeam(currentUser.teamId, challenge.id) : false);
      
      // Get the category for the challenge
      const category = await storage.getCategory(challenge.categoryId);
      
      // Get number of solves
      const solves = (await storage.listSubmissionsByChallenge(challenge.id)).length;
      
      // Don't send the flag to client
      const { flag, ...challengeWithoutFlag } = challenge;
      
      const enrichedChallenge = {
        ...challengeWithoutFlag,
        solved: userSolved || teamSolved,
        hintUnlocked,
        hint: hintUnlocked ? challenge.hintText : null,
        category: category || { name: "Unknown", color: "#808080" },
        solves
      };
      
      res.status(200).json(enrichedChallenge);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/challenges/:id/submit", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Validate submission
      const submissionSchema = z.object({
        flag: z.string()
      });
      
      const { flag } = submissionSchema.parse(req.body);
      
      // Get challenge
      const challenge = await storage.getChallenge(challengeId);
      
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Check if already solved by user
      const alreadySolved = await storage.isChallengeCompletedByUser(currentUser.id, challengeId);
      if (alreadySolved) {
        return res.status(400).json({ message: "You have already solved this challenge" });
      }
      
      // Check if flag is correct
      if (flag !== challenge.flag) {
        return res.status(400).json({ message: "Incorrect flag" });
      }
      
      // Create submission
      const submission = await storage.createSubmission({
        userId: currentUser.id,
        teamId: currentUser.teamId || null,
        challengeId
      });
      
      res.status(200).json({ 
        message: "Flag correct! Points awarded.", 
        points: challenge.points,
        isFirstBlood: submission.isFirstBlood
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/challenges/:id/hint", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Get challenge
      const challenge = await storage.getChallenge(challengeId);
      
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Check if hint already unlocked
      const hintUnlocked = await storage.isHintUnlockedByUser(currentUser.id, challengeId) || 
                           (currentUser.teamId ? await storage.isHintUnlockedByTeam(currentUser.teamId, challengeId) : false);
      
      if (hintUnlocked) {
        return res.status(400).json({ message: "Hint already unlocked" });
      }
      
      // Create hint unlock
      await storage.createHintUnlock({
        userId: currentUser.id,
        teamId: currentUser.teamId || null,
        challengeId
      });
      
      res.status(200).json({ 
        message: "Hint unlocked!", 
        hint: challenge.hintText,
        cost: challenge.hintCost
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Scoreboard routes
  app.get("/api/scoreboard/users", isAuthenticated, async (req, res) => {
    try {
      const scoreboard = await storage.getUserScoreboard();
      res.status(200).json(scoreboard);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/scoreboard/teams", isAuthenticated, async (req, res) => {
    try {
      const scoreboard = await storage.getTeamScoreboard();
      res.status(200).json(scoreboard);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin routes
  app.post("/api/admin/categories", isAdmin, async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const newCategory = await storage.createCategory(validatedData);
      res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/challenges", isAdmin, async (req, res) => {
    try {
      const validatedData = insertChallengeSchema.parse(req.body);
      const newChallenge = await storage.createChallenge(validatedData);
      res.status(201).json(newChallenge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/admin/challenges/:id", isAdmin, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      
      // Validate update data
      const updateSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        points: z.number().positive().optional(),
        flag: z.string().optional(),
        resourceUrl: z.string().optional(),
        categoryId: z.number().positive().optional(),
        hintText: z.string().optional(),
        hintCost: z.number().positive().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Update challenge
      const updatedChallenge = await storage.updateChallenge(challengeId, validatedData);
      
      if (!updatedChallenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      res.status(200).json(updatedChallenge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/admin/challenges/:id", isAdmin, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      const deleted = await storage.deleteChallenge(challengeId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      res.status(200).json({ message: "Challenge deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin user management routes
  app.put("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Validate update data
      const updateSchema = z.object({
        isAdmin: z.boolean(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Update user
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Admin team management routes
  app.post("/api/admin/teams", isAdmin, async (req, res) => {
    try {
      // Validate team data
      const teamSchema = z.object({
        name: z.string().min(3),
        description: z.string().optional(),
        captainId: z.number()
      });
      
      const validatedData = teamSchema.parse(req.body);
      
      // Check if captain exists
      const captain = await storage.getUser(validatedData.captainId);
      if (!captain) {
        return res.status(400).json({ message: "Captain user not found" });
      }
      
      // Check if captain is already in a team
      if (captain.teamId) {
        return res.status(400).json({ message: "Captain is already in another team" });
      }
      
      // Create the team
      const team = await storage.createTeam({
        name: validatedData.name,
        description: validatedData.description || null,
        captainId: validatedData.captainId
      });
      
      // Update the captain's team ID
      await storage.updateUser(validatedData.captainId, { teamId: team.id });
      
      res.status(201).json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/admin/teams/:id", isAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      
      // Get all users in this team
      const teamMembers = await storage.getTeamMembers(teamId);
      
      // Set teamId to null for all team members
      for (const member of teamMembers) {
        await storage.updateUser(member.id, { teamId: null });
      }
      
      // Delete the team
      const deleted = await storage.deleteTeam(teamId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.status(200).json({ message: "Team deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Docker Duel Routes
  
  // Administración de imágenes Docker
  app.get("/api/duels/images", isAuthenticated, async (req, res) => {
    try {
      // Verificar si el usuario es administrador
      const currentUser = req.user as any;
      
      // Si es administrador, mostrar todas las imágenes
      // Si no, mostrar solo las habilitadas
      const images = currentUser.isAdmin 
        ? await storage.listDuelImages()
        : await storage.listEnabledDuelImages();
        
      res.json(images);
    } catch (error) {
      console.error("Error al obtener imágenes:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/duels/images", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const newImage = await storage.createDuelImage(req.body);
      res.status(201).json(newImage);
    } catch (error) {
      console.error("Error al crear imagen:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/duels/images/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const imageData = req.body;
      
      const updatedImage = await storage.updateDuelImage(imageId, imageData);
      
      if (!updatedImage) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      res.json(updatedImage);
    } catch (error) {
      console.error("Error al actualizar imagen:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put("/api/duels/images/:id/toggle", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const { enabled } = req.body;
      
      const updatedImage = await storage.toggleDuelImageStatus(imageId, enabled);
      
      if (!updatedImage) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      res.json(updatedImage);
    } catch (error) {
      console.error("Error al actualizar estado de imagen:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/duels/images/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      
      // Implementar método deleteDuelImage en storage
      // Temporalmente usamos toggleDuelImageStatus(id, false) para "desactivar" la imagen
      const updatedImage = await storage.toggleDuelImageStatus(imageId, false);
      
      if (!updatedImage) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      res.status(200).json({ message: "Image disabled successfully" });
    } catch (error) {
      console.error("Error al eliminar imagen:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Obtener estadísticas de duelo de un usuario
  app.get("/api/duels/stats", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const stats = await storage.getDuelStats(currentUser.id);
      
      if (!stats) {
        // Si no tiene estadísticas, crear estadísticas iniciales
        const newStats = await storage.createDuelStats({
          userId: currentUser.id,
          duelWins: 0,
          duelLosses: 0,
          duelRating: 1000,
          duelLastPlayed: null
        });
        
        return res.status(200).json(newStats);
      }
      
      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Obtener clasificación de duelos
  app.get("/api/duels/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getDuelLeaderboard();
      res.status(200).json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Unirse a la cola de emparejamiento para duelos
  app.post("/api/duels/queue/join", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Verificar si el usuario ya está en un duelo activo
      const activeMatch = await storage.getActiveDuelMatch(currentUser.id);
      if (activeMatch) {
        return res.status(400).json({ 
          message: "You are already in an active duel match",
          matchId: activeMatch.id
        });
      }
      
      // Añadir a la cola
      const queueEntry = await storage.addToQueue(currentUser.id);
      
      // Intentar hacer un emparejamiento
      const match = await storage.matchUsersFromQueue();
      
      if (match) {
        // Si se hizo un emparejamiento y este usuario es parte de él
        if (match.player1Id === currentUser.id || match.player2Id === currentUser.id) {
          // Crear un nuevo duelo
          const newMatch = await storage.createDuelMatch({
            player1Id: match.player1Id,
            player2Id: match.player2Id,
            status: "preparing"
          });
          
          return res.status(201).json({
            message: "Match found!",
            match: newMatch
          });
        }
      }
      
      // Si no hubo emparejamiento, devolver la entrada en la cola
      res.status(200).json({
        message: "Added to queue",
        queueEntry
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Salir de la cola de emparejamiento
  app.post("/api/duels/queue/leave", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Eliminar de la cola
      const removed = await storage.removeFromQueue(currentUser.id);
      
      if (!removed) {
        return res.status(400).json({ message: "You are not in the queue" });
      }
      
      res.status(200).json({ message: "Removed from queue" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Verificar estado de la cola
  app.get("/api/duels/queue/status", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Verificar si está en la cola 
      // Usamos una implementación temporal mientras se arregla la BD
      let inQueue = false;
      try {
        inQueue = await storage.isUserInQueue(currentUser.id);
        console.log(`API /api/duels/queue/status: Usuario ${currentUser.id} en cola: ${inQueue}`);
      } catch (error) {
        console.error("Error al verificar la cola:", error);
      }
      
      // Verificar si tiene un duelo activo
      let activeMatch = null;
      try {
        activeMatch = await storage.getActiveDuelMatch(currentUser.id);
      } catch (error) {
        console.error("Error al obtener el duelo activo:", error);
      }
      
      res.status(200).json({
        inQueue,
        activeMatch: activeMatch || null
      });
    } catch (error: any) {
      console.error("Error en /api/duels/queue/status:", error.message);
      res.status(500).json({ message: "Server error", details: error.message });
    }
  });
  
  // Enviar un desafío directo a otro usuario
  app.post("/api/duels/challenge", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Validar datos del desafío
      const challengeSchema = z.object({
        challengedId: z.number(),
        expiresAt: z.date().optional()
      });
      
      const { challengedId, expiresAt } = challengeSchema.parse(req.body);
      
      // No se puede desafiar a uno mismo
      if (challengedId === currentUser.id) {
        return res.status(400).json({ message: "You cannot challenge yourself" });
      }
      
      // Verificar si el usuario a desafiar existe
      const challenged = await storage.getUser(challengedId);
      if (!challenged) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verificar si hay desafíos pendientes entre ambos
      const userChallenges = await storage.getUserDuelChallenges(currentUser.id);
      const pendingChallenge = userChallenges.find(challenge => 
        (challenge.challengerId === currentUser.id && challenge.challengedId === challengedId ||
         challenge.challengerId === challengedId && challenge.challengedId === currentUser.id) &&
        challenge.status === "pending"
      );
      
      if (pendingChallenge) {
        return res.status(400).json({ 
          message: "There's already a pending challenge between you two",
          challengeId: pendingChallenge.id
        });
      }
      
      // Crear desafío
      const challenge = await storage.createDuelChallenge({
        challengerId: currentUser.id,
        challengedId: challengedId,
        status: "pending",
        expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas por defecto
      });
      
      res.status(201).json(challenge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Responder a un desafío
  app.put("/api/duels/challenge/:id/respond", isAuthenticated, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Obtener el desafío
      const challenge = await storage.getDuelChallenge(challengeId);
      
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Verificar que el desafío es para este usuario
      if (challenge.challengedId !== currentUser.id) {
        return res.status(403).json({ message: "This challenge is not for you" });
      }
      
      // Verificar que el desafío está pendiente
      if (challenge.status !== "pending") {
        return res.status(400).json({ message: "This challenge has already been responded to" });
      }
      
      // Validar respuesta
      const responseSchema = z.object({
        accept: z.boolean()
      });
      
      const { accept } = responseSchema.parse(req.body);
      
      // Actualizar estado del desafío
      const newStatus = accept ? "accepted" : "rejected";
      const updatedChallenge = await storage.updateDuelChallengeStatus(challengeId, newStatus);
      
      // Si se aceptó, crear un duelo
      if (accept) {
        const match = await storage.createDuelMatch({
          player1Id: challenge.challengerId,
          player2Id: challenge.challengedId,
          status: "preparing"
        });
        
        return res.status(200).json({
          challenge: updatedChallenge,
          match
        });
      }
      
      res.status(200).json(updatedChallenge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Obtener desafíos del usuario
  app.get("/api/duels/challenges", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      const challenges = await storage.getUserDuelChallenges(currentUser.id);
      
      res.status(200).json(challenges);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Obtener información de un duelo
  app.get("/api/duels/matches/:id", isAuthenticated, async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      const match = await storage.getDuelMatch(matchId);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Verificar si el usuario es parte del duelo
      if (match.player1Id !== currentUser.id && match.player2Id !== currentUser.id && !currentUser.isAdmin) {
        return res.status(403).json({ message: "You are not part of this match" });
      }
      
      res.status(200).json(match);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Obtener duelos del usuario
  app.get("/api/duels/matches", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      const matches = await storage.getUserDuelMatches(currentUser.id);
      
      res.status(200).json(matches);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Actualizar estado de un duelo (principalmente para admins)
  // Endpoint para que un usuario cancele su duelo activo
  app.post("/api/duels/match/cancel", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Obtener el duelo activo para este usuario
      const activeMatch = await storage.getActiveDuelMatch(currentUser.id);
      
      if (!activeMatch) {
        return res.status(400).json({ message: "You don't have an active match to cancel" });
      }
      
      // Solo se pueden cancelar duelos en estado 'preparing' o 'in_progress'
      if (activeMatch.status !== 'preparing' && activeMatch.status !== 'in_progress') {
        return res.status(400).json({ 
          message: "Match cannot be cancelled in its current state",
          status: activeMatch.status 
        });
      }
      
      // Verificar que el usuario es parte del duelo
      if (activeMatch.player1Id !== currentUser.id && activeMatch.player2Id !== currentUser.id) {
        return res.status(403).json({ message: "You are not a participant in this match" });
      }
      
      // Actualizar el estado del duelo a 'cancelled'
      const updatedMatch = await storage.updateDuelMatch(activeMatch.id, {
        status: 'cancelled',
        endedAt: new Date(),
        logs: activeMatch.logs + "\nMatch cancelled by user " + currentUser.username
      });
      
      // Si el usuario está en cola, lo eliminamos
      const isInQueue = await storage.isUserInQueue(currentUser.id);
      if (isInQueue) {
        await storage.removeFromQueue(currentUser.id);
      }
      
      res.status(200).json({ 
        message: "Match cancelled successfully",
        match: updatedMatch
      });
    } catch (error) {
      console.error("Error cancelling match:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/duels/matches/:id/status", isAdmin, async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      
      // Validar nuevo estado
      const statusSchema = z.object({
        status: z.enum(["preparing", "in_progress", "player1_victory", "player2_victory", "draw", "cancelled"]),
        winnerId: z.number().nullable().optional(),
        scoreChange: z.number().nullable().optional()
      });
      
      const { status, winnerId, scoreChange } = statusSchema.parse(req.body);
      
      // Obtener el duelo
      const match = await storage.getDuelMatch(matchId);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Actualizar estado
      let updatedMatch;
      
      if (winnerId && scoreChange && (status === "player1_victory" || status === "player2_victory")) {
        // Si hay un ganador, actualizar con setDuelMatchWinner
        updatedMatch = await storage.setDuelMatchWinner(matchId, winnerId, scoreChange);
      } else {
        // Actualización normal
        updatedMatch = await storage.updateDuelMatchStatus(matchId, status);
      }
      
      res.status(200).json(updatedMatch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Simular resultados para pruebas (solo admins)
  app.post("/api/duels/simulate", isAdmin, async (req, res) => {
    try {
      const simulationSchema = z.object({
        player1Id: z.number(),
        player2Id: z.number(),
        winnerId: z.number(),
        scoreChange: z.number().default(25)
      });
      
      const { player1Id, player2Id, winnerId, scoreChange } = simulationSchema.parse(req.body);
      
      // Verificar que los usuarios existen
      const player1 = await storage.getUser(player1Id);
      const player2 = await storage.getUser(player2Id);
      
      if (!player1 || !player2) {
        return res.status(404).json({ message: "One or both players not found" });
      }
      
      // Verificar que el ganador es uno de los jugadores
      if (winnerId !== player1Id && winnerId !== player2Id) {
        return res.status(400).json({ message: "Winner must be one of the players" });
      }
      
      // Crear duelo
      const match = await storage.createDuelMatch({
        player1Id,
        player2Id,
        status: "in_progress"
      });
      
      // Establecer resultado
      const updatedMatch = await storage.setDuelMatchWinner(match.id, winnerId, scoreChange);
      
      res.status(201).json(updatedMatch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // =================================================================
  // DOCKER LAB ROUTES - Implementación de laboratorio de Docker interactivo
  // =================================================================

  // Listar imágenes Docker habilitadas (solo devuelve las enabled=true)
  app.get("/api/duels/images", isAuthenticated, async (req, res) => {
    try {
      const images = await storage.listEnabledDuelImages();
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // ========== Terminal Interactivo ==========
  // Listar todos los contenedores (solo admin)
  app.get("/api/terminal/containers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Importar servicio Docker
      const { dockerService } = await import('./docker-service');
      
      // Obtener listado completo de contenedores
      const containers = await dockerService.listDetailedContainers();
      
      res.json(containers);
    } catch (error) {
      console.error("Error al listar contenedores:", error);
      res.status(500).json({ message: "Error al listar contenedores" });
    }
  });
  
  // Listar contenedores del usuario actual
  app.get("/api/terminal/my-containers", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Importar servicio Docker
      const { dockerService } = await import('./docker-service');
      
      // Obtener todos los contenedores
      const allContainers = await dockerService.listDetailedContainers();
      
      // Filtrar solo los del usuario actual
      const userContainers = allContainers.filter(
        container => container.userId === currentUser.id
      );
      
      res.json(userContainers);
    } catch (error) {
      console.error("Error al listar contenedores del usuario:", error);
      res.status(500).json({ message: "Error al listar contenedores" });
    }
  });
  
  // Conectar a un contenedor existente
  app.post("/api/terminal/connect/:containerId", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const containerId = req.params.containerId;
      
      // Importar servicio Docker
      const { dockerService } = await import('./docker-service');
      
      // Verificar si el contenedor existe
      try {
        const status = await dockerService.checkContainerStatus(containerId);
        
        if (status !== 'running') {
          return res.status(400).json({ 
            message: `El contenedor no está en ejecución (estado: ${status})` 
          });
        }
      } catch (error) {
        return res.status(404).json({ message: "Contenedor no encontrado" });
      }
      
      // Verificar si el usuario es admin o si el contenedor le pertenece
      const containers = await dockerService.listDetailedContainers();
      const container = containers.find(c => c.id === containerId);
      
      if (!container) {
        return res.status(404).json({ message: "Contenedor no encontrado" });
      }
      
      // Verificar si el usuario tiene acceso a este contenedor
      const isAdmin = (currentUser.isAdmin === true);
      const isOwner = (container.userId === currentUser.id);
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ 
          message: "No tienes permiso para acceder a este contenedor" 
        });
      }
      
      // Crear una sesión nueva para este contenedor
      const { sessionId, token } = await dockerService.createSessionForExistingContainer(
        containerId,
        currentUser.id
      );
      
      // Si tenemos el schema en la base de datos, registramos también ahí
      try {
        // Crear un registro en la base de datos para esta sesión (usando matchId=0 para terminal interactivo)
        const dbSession = await storage.createDuelTerminalSession({
          userId: currentUser.id,
          matchId: container.matchId || 0,
          token,
          containerId,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
          isActive: true,
          lastActivityAt: new Date()
        });
        
        return res.status(200).json({
          sessionId: dbSession.id,
          token: token,
          containerId,
          message: "Conectado correctamente al contenedor"
        });
      } catch (dbError) {
        // Si falla la base de datos, usamos la sesión de memoria del servicio Docker
        console.error("Error al registrar sesión en BD:", dbError);
        
        return res.status(200).json({
          sessionId,
          token,
          containerId,
          message: "Conectado al contenedor (sesión en memoria)"
        });
      }
    } catch (error) {
      console.error("Error al conectar al contenedor:", error);
      res.status(500).json({ message: "Error al conectar al contenedor" });
    }
  });
  
  // ========== Docker Lab ==========
  // Endpoint específico para Docker Lab - Lanzar contenedor sin crear duelo
  app.post("/api/docker-lab/launch", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Validar datos de entrada
      const launchSchema = z.object({
        imageId: z.number()
      });
      
      const { imageId } = launchSchema.parse(req.body);
      
      // Verificar que la imagen existe y está habilitada
      const image = await storage.getDuelImage(imageId);
      
      if (!image || !image.isEnabled) {
        return res.status(404).json({ message: "Docker image not found or disabled" });
      }
      
      // Buscar si ya existe una partida especial para Docker Lab (matchId especial)
      let labMatch = await storage.getDockerLabMatch();
      
      // Si no existe, creamos una partida especial para Docker Lab
      if (!labMatch) {
        labMatch = await storage.createDuelMatch({
          player1Id: 0, // Valores especiales para indicar que es Docker Lab
          player2Id: 0,
          status: "docker_lab"
        });
        console.log("Creada partida especial para Docker Lab:", labMatch.id);
      }
      
      // Generar token de autenticación aleatorio para la sesión
      const token = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      // Crear la sesión de terminal en la base de datos usando el matchId del lab
      const session = await storage.createDuelTerminalSession({
        userId: currentUser.id,
        matchId: labMatch.id, // Usamos el ID de la partida especial para Docker Lab
        token: token,
        containerId: 'pending', // Se actualizará con el ID real del contenedor
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
        isActive: true,
        lastActivityAt: new Date()
      });
      
      try {
        // Importar el servicio Docker
        const { dockerService } = await import('./docker-service');
        
        // Lanzar un contenedor Docker real - usando imageTag como alternativa al docker_image
        const dockerImage = image.imageTag || 'kalilinux/kali-rolling';
        
        console.log(`[DockerLab] Lanzando contenedor con imagen: ${dockerImage} para la sesión ID ${session.id}`);
        
        // Crear el contenedor Docker (usamos matchId=0 para indicar que es Docker Lab)
        const { containerId } = await dockerService.createContainer(
          dockerImage, 
          { 
            userId: currentUser.id, 
            matchId: 0, // Valor especial para Docker Lab
            sessionId: session.id
          }
        );
        
        // Actualizar la sesión con el ID del contenedor real
        await storage.updateDuelTerminalSession(session.id, {
          containerId: containerId
        });
        
        console.log(`[DockerLab] Contenedor creado exitosamente: ${containerId}`);
        
        // Responder con la información de sesión
        return res.status(201).json({
          sessionId: session.id,
          token: session.token,
          containerId: containerId
        });
      } catch (dockerError) {
        console.error("[DockerLab] Error al crear contenedor:", dockerError);
        
        // Si falla la creación del contenedor, devolver sesión de terminal simulada
        console.log("[DockerLab] Usando terminal simulada como fallback");
        
        return res.status(201).json({
          sessionId: session.id,
          token: session.token,
          simulatedMode: true
        });
      }
    } catch (error) {
      console.error("Error al lanzar contenedor en Docker Lab:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Verificar sesiones activas en Docker Lab
  app.get("/api/docker-lab/active-sessions", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Obtener todas las sesiones activas para este usuario en Docker Lab usando el matchId correcto
      const activeSessions = await storage.getUserActiveDockerLabSessions(currentUser.id);
      
      res.json(activeSessions || []);
    } catch (error) {
      console.error("Error al obtener sesiones activas de Docker Lab:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Verificar sesión activa del usuario
  app.get("/api/duels/terminal/active", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Buscamos un duelo activo para obtener el ID del duelo
      const activeMatch = await storage.getActiveDuelMatch(currentUser.id);
      
      if (!activeMatch) {
        return res.json(null);
      }
      
      // Buscar sesión activa de terminal para este usuario y este duelo
      const session = await storage.getUserActiveDuelTerminalSession(
        currentUser.id,
        activeMatch.id
      );
      
      if (!session) {
        return res.json(null);
      }
      
      // Devolver solo la información necesaria para el cliente
      res.json({
        sessionId: session.id,
        token: session.token,
        matchId: activeMatch.id
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Iniciar un nuevo contenedor Docker y crear una sesión de terminal
  app.post("/api/duels/terminal/launch", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      
      // Validar datos de entrada
      const launchSchema = z.object({
        imageId: z.number()
      });
      
      const { imageId } = launchSchema.parse(req.body);
      
      // Verificar si el usuario ya tiene una sesión activa
      const activeMatch = await storage.getActiveDuelMatch(currentUser.id);
      
      if (activeMatch) {
        const existingSession = await storage.getUserActiveDuelTerminalSession(
          currentUser.id,
          activeMatch.id
        );
        
        if (existingSession) {
          return res.json({
            sessionId: existingSession.id,
            token: existingSession.token,
            matchId: activeMatch.id
          });
        }
      }
      
      // Verificar que la imagen existe y está habilitada
      const image = await storage.getDuelImage(imageId);
      
      if (!image || !image.isEnabled) {
        return res.status(404).json({ message: "Docker image not found or disabled" });
      }
      
      // Crear un nuevo duelo de práctica (solo el usuario actual)
      const newMatch = await storage.createDuelMatch({
        player1Id: currentUser.id,
        player2Id: currentUser.id, // Mismo jugador, modo práctica
        status: "practice"
      });
      
      // Importar el servicio Docker
      const { dockerService } = await import('./docker-service');
      
      // Generar token de autenticación aleatorio para la sesión
      const token = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      // Crear la sesión de terminal en la base de datos
      const session = await storage.createDuelTerminalSession({
        userId: currentUser.id,
        matchId: newMatch.id,
        token: token,
        containerId: 'pending', // Se actualizará con el ID real del contenedor
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
        isActive: true,
        lastActivityAt: new Date()
      });
      
      try {
        // Lanzar un contenedor Docker real
        // Usamos la imagen por defecto de kali si no hay configuración específica
        const dockerImage = image.imageTag || 'kalilinux/kali-rolling';
        
        console.log(`Lanzando contenedor Docker con imagen: ${dockerImage} para la sesión ID ${session.id}`);
        
        // Crear el contenedor Docker
        const { containerId } = await dockerService.createContainer(
          dockerImage, 
          { 
            userId: currentUser.id, 
            matchId: newMatch.id,
            sessionId: session.id
          }
        );
        
        // Actualizar la sesión con el ID del contenedor real
        await storage.updateDuelTerminalSession(session.id, {
          containerId: containerId
        });
        
        console.log(`Contenedor Docker creado exitosamente: ${containerId}`);
        
        // Responder con la información de sesión
        return res.status(201).json({
          sessionId: session.id,
          token: session.token,
          matchId: newMatch.id,
          containerId: containerId
        });
      } catch (dockerError) {
        console.error("Error al crear contenedor Docker:", dockerError);
        
        // Si falla la creación del contenedor, devolver sesión de terminal simulada
        console.log("Usando terminal simulada como fallback");
        
        return res.status(201).json({
          sessionId: session.id,
          token: session.token,
          matchId: newMatch.id,
          simulatedMode: true
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });

  // Cerrar una sesión de terminal
  app.post("/api/duels/terminal/session/:sessionId/close", isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const sessionId = parseInt(req.params.sessionId);
      
      // Obtener la sesión
      const session = await storage.getDuelTerminalSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Verificar que la sesión pertenece al usuario
      if (session.userId !== currentUser.id) {
        return res.status(403).json({ message: "You don't have permission to close this session" });
      }
      
      try {
        // Importar servicio Docker para detener el contenedor
        const { dockerService } = await import('./docker-service');
        
        if (session.containerId && session.containerId !== 'pending') {
          console.log(`Deteniendo contenedor Docker: ${session.containerId}`);
          await dockerService.stopContainer(session.containerId);
          console.log("Contenedor detenido correctamente");
        }
      } catch (dockerError) {
        console.error("Error al detener contenedor Docker:", dockerError);
        // Continuamos para cerrar la sesión en la base de datos aunque
        // falle la detención del contenedor
      }
      
      // Cerrar la sesión en la base de datos
      await storage.closeDuelTerminalSession(sessionId);
      
      res.status(200).json({ message: "Session closed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Configuración del WebSocket Server para la terminal interactiva
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/api/duels/terminal/connect' });
  
  wss.on('connection', async (ws, req) => {
    try {
      // Obtener token y sessionId de la URL
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const sessionId = url.searchParams.get('sessionId');
      
      if (!token || !sessionId) {
        ws.close(1008, 'Missing token or sessionId');
        return;
      }
      
      // Verificar sesión
      const session = await storage.getDuelTerminalSessionByToken(token);
      
      if (!session || session.id !== parseInt(sessionId) || !session.isActive) {
        ws.close(1008, 'Invalid session');
        return;
      }
      
      // Actualizar actividad
      await storage.updateDuelTerminalSessionActivity(session.id);
      
      try {
        // Importar servicio Docker
        const { dockerService } = await import('./docker-service');
        let containerStream: NodeJS.ReadWriteStream | null = null;
        let simulatedMode = false;
        
        // Intentar conectar al contenedor Docker
        if (session.containerId && session.containerId !== 'pending') {
          try {
            console.log(`Conectando al contenedor Docker: ${session.containerId}`);
            
            // Verificar estado del contenedor
            const containerStatus = await dockerService.checkContainerStatus(session.containerId);
            if (containerStatus !== 'running') {
              throw new Error(`Container is not running (status: ${containerStatus})`);
            }
            
            // Obtener imagen asociada con el duelo
            const duelMatch = await storage.getDuelMatch(session.matchId);
            let imageName = "Container Linux";
            
            if (duelMatch && duelMatch.duelImageId) {
              const duelImage = await storage.getDuelImage(duelMatch.duelImageId);
              if (duelImage) {
                imageName = duelImage.name;
              }
            }
            
            // Enviar mensaje de bienvenida con información real
            ws.send(`\r\n\x1b[1;32mConectado al contenedor Docker real: ${imageName}\x1b[0m\r\n\r\n`);
            
            // Conectar al stream del contenedor
            containerStream = await dockerService.getInteractiveStream(session.containerId);
            
            // Configurar manejo de datos del contenedor al cliente
            containerStream.on('data', (data) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
              }
            });
            
            // Configurar manejo de errores del contenedor
            containerStream.on('error', (error) => {
              console.error(`Container stream error: ${error}`);
              
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(`\r\n\x1b[1;31mError de conexión con el contenedor: ${error.message}\x1b[0m\r\n`);
                // Cambiar a modo simulado como fallback
                simulatedMode = true;
              }
            });
            
            // Configurar cierre del stream
            containerStream.on('end', () => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(`\r\n\x1b[1;33mLa conexión con el contenedor ha finalizado\x1b[0m\r\n`);
                // Cambiar a modo simulado como fallback
                simulatedMode = true;
              }
            });
            
            // Manejar mensajes del cliente al contenedor
            ws.on('message', async (message) => {
              // Enviar entrada del usuario al contenedor
              if (containerStream && !simulatedMode) {
                try {
                  // Convertir el mensaje a string antes de enviar al contenedor
                  containerStream.write(message.toString());
                  
                  // Actualizar timestamp de actividad
                  await storage.updateDuelTerminalSessionActivity(session.id);
                } catch (streamError) {
                  console.error(`Error sending data to container: ${streamError}`);
                  simulatedMode = true;
                  
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(`\r\n\x1b[1;31mError enviando datos al contenedor. Cambiando a modo simulado.\x1b[0m\r\n`);
                  }
                }
              } else if (simulatedMode) {
                // Modo simulado como fallback (mismo comportamiento que antes)
                handleSimulatedTerminal(ws, message.toString());
                await storage.updateDuelTerminalSessionActivity(session.id);
              }
            });
            
            // Manejar cierre de conexión WebSocket
            ws.on('close', () => {
              if (containerStream) {
                // Cerrar stream pero mantener contenedor activo
                // El contenedor se limpiará cuando expire la sesión o el usuario la cierre explícitamente
                try {
                  containerStream.end();
                } catch (error) {
                  console.error(`Error closing container stream: ${error}`);
                }
              }
            });
            
          } catch (error) {
            const containerError = error as Error;
            console.error(`Container connection error: ${containerError.message}`);
            simulatedMode = true;
            
            // Enviar mensaje de error y cambiar a modo simulado
            const errorMessage = containerError.message || "Error desconocido";
            ws.send(`\r\n\x1b[1;31mNo se pudo conectar al contenedor: ${errorMessage}\x1b[0m\r\n`);
            ws.send(`\r\n\x1b[1;33mUsando terminal simulada como alternativa\x1b[0m\r\n\r\n`);
            
            // Configurar modo simulado
            setupSimulatedTerminal(ws);
          }
        } else {
          // Contenedor pendiente o no disponible, usar modo simulado
          simulatedMode = true;
          ws.send(`\r\n\x1b[1;33mUtilizando terminal simulada (no hay contenedor asignado)\x1b[0m\r\n\r\n`);
          setupSimulatedTerminal(ws);
        }
      } catch (error) {
        // Si hay un error cargando el servicio Docker, usar terminal simulada
        const dockerServiceError = error as Error;
        console.error(`Docker service error: ${dockerServiceError.message || "Error desconocido"}`);
        ws.send(`\r\n\x1b[1;31mError del servicio Docker: ${dockerServiceError.message || "Error desconocido"}\x1b[0m\r\n`);
        ws.send(`\r\n\x1b[1;33mUsando terminal simulada\x1b[0m\r\n\r\n`);
        
        // Configurar modo simulado
        setupSimulatedTerminal(ws);
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.close(1011, 'Server error');
    }
  });
  
  // Función para manejar el modo simulado (terminal virtual)
  function handleSimulatedTerminal(ws: WebSocket, message: string) {
    if (message === 'ls\r') {
      ws.send('\r\nbin  etc  home  lib  root  usr  var\r\n');
    } else if (message === 'pwd\r') {
      ws.send('\r\n/root\r\n');
    } else if (message.startsWith('cd ')) {
      ws.send('\r\n');
    } else if (message === 'help\r' || message === 'ayuda\r') {
      ws.send('\r\n\x1b[1;33mComandos disponibles en modo simulado:\x1b[0m\r\n' + 
              'ls, pwd, cd, help/ayuda, echo, cat\r\n');
    } else if (message.startsWith('echo ')) {
      ws.send('\r\n' + message.substring(5).replace('\r', '') + '\r\n');
    } else if (message.startsWith('cat ')) {
      const file = message.substring(4).replace('\r', '').trim();
      if (file === '/etc/passwd') {
        ws.send('\r\nroot:x:0:0:root:/root:/bin/bash\r\n');
      } else if (file === '/etc/hostname') {
        ws.send('\r\nctf-container\r\n');
      } else {
        ws.send(`\r\ncat: ${file}: No such file or directory\r\n`);
      }
    } else if (message === '\r') {
      ws.send('\r\n');
    } else {
      ws.send('\r\n' + message.replace('\r', '') + ': command not found\r\n');
    }
  }
  
  // Configurar handlers para el terminal simulado
  function setupSimulatedTerminal(ws: WebSocket) {
    ws.on('message', async (message) => {
      handleSimulatedTerminal(ws, message.toString());
    });
  }

  return httpServer;
}
