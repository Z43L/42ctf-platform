import {
  users, teams, categories, challenges, submissions, hintUnlocks, 
  competitions, competitionChallenges, teamJoinRequests,
  usersDuelStats, duelQueue, duelChallenges, duelMatches, duelMatchChallenges,
  duelImages, duelTerminalSessions,
  type User, type InsertUser, 
  type Team, type InsertTeam, 
  type Category, type InsertCategory, 
  type Challenge, type InsertChallenge, 
  type Submission, type InsertSubmission, 
  type HintUnlock, type InsertHintUnlock, 
  type Competition, type InsertCompetition, 
  type CompetitionChallenge, type InsertCompetitionChallenge, 
  type TeamJoinRequest, type InsertTeamJoinRequest,
  type UsersDuelStats, type InsertUsersDuelStats,
  type DuelQueue, type InsertDuelQueue,
  type DuelChallenge, type InsertDuelChallenge,
  type DuelMatch, type InsertDuelMatch,
  type DuelMatchChallenge, type InsertDuelMatchChallenge,
  type DuelImage, type InsertDuelImage,
  type DuelTerminalSession, type InsertDuelTerminalSession
} from "@shared/schema";
import { db } from "./db";
import { and, eq, or, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresStore = connectPg(session);

// Storage interface for all CRUD operations
export interface IStorage {
  // Session storage
  sessionStore: session.Store;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;

  // Team operations
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByName(name: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  listTeams(): Promise<Team[]>;
  getTeamMembers(teamId: number): Promise<User[]>;

  // Category operations
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined>;
  listCategories(): Promise<Category[]>;

  // Challenge operations
  getChallenge(id: number): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  updateChallenge(id: number, challengeData: Partial<Challenge>): Promise<Challenge | undefined>;
  deleteChallenge(id: number): Promise<boolean>;
  listChallenges(): Promise<Challenge[]>;
  getChallengesByCategory(categoryId: number): Promise<Challenge[]>;

  // Submission operations
  getSubmission(id: number): Promise<Submission | undefined>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  listSubmissionsByUser(userId: number): Promise<Submission[]>;
  listSubmissionsByTeam(teamId: number): Promise<Submission[]>;
  listSubmissionsByChallenge(challengeId: number): Promise<Submission[]>;
  isChallengeCompletedByUser(userId: number, challengeId: number): Promise<boolean>;
  isChallengeCompletedByTeam(teamId: number, challengeId: number): Promise<boolean>;

  // Hint operations
  createHintUnlock(hintUnlock: InsertHintUnlock): Promise<HintUnlock>;
  isHintUnlockedByUser(userId: number, challengeId: number): Promise<boolean>;
  isHintUnlockedByTeam(teamId: number, challengeId: number): Promise<boolean>;

  // Competition operations
  getCompetition(id: number): Promise<Competition | undefined>;
  getActiveCompetition(): Promise<Competition | undefined>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  updateCompetition(id: number, competitionData: Partial<Competition>): Promise<Competition | undefined>;
  addChallengeToCompetition(competitionId: number, challengeId: number): Promise<CompetitionChallenge>;

  // Team Join Request operations
  createTeamJoinRequest(request: InsertTeamJoinRequest): Promise<TeamJoinRequest>;
  updateTeamJoinRequest(id: number, status: string): Promise<TeamJoinRequest | undefined>;
  getTeamJoinRequests(teamId: number): Promise<TeamJoinRequest[]>;
  getUserTeamJoinRequests(userId: number): Promise<TeamJoinRequest[]>;

  // Scoreboard operations
  getUserScore(userId: number): Promise<number>;
  getTeamScore(teamId: number): Promise<number>;
  getUserScoreboard(): Promise<{ userId: number, username: string, score: number }[]>;
  getTeamScoreboard(): Promise<{ teamId: number, teamName: string, score: number }[]>;

  // Duel Stats Operations
  getDuelStats(userId: number): Promise<UsersDuelStats | undefined>;
  createDuelStats(stats: InsertUsersDuelStats): Promise<UsersDuelStats>;
  updateDuelStats(userId: number, win: boolean, ratingChange: number): Promise<UsersDuelStats | undefined>;
  getDuelLeaderboard(): Promise<{ userId: number, username: string, rating: number, wins: number, losses: number }[]>;

  // Duel Queue Operations
  enqueueDuelRequest(request: InsertDuelQueue): Promise<DuelQueue>;
  dequeueUserFromDuelQueue(userId: number): Promise<boolean>;
  getUserDuelQueueStatus(userId: number): Promise<DuelQueue | undefined>;
  findDuelMatch(): Promise<{ player1: DuelQueue, player2: DuelQueue } | null>;
  isUserInQueue(userId: number): Promise<boolean>;
  addToQueue(userId: number): Promise<DuelQueue>;
  removeFromQueue(userId: number): Promise<boolean>;
  matchUsersFromQueue(): Promise<{ player1Id: number, player2Id: number } | null>;

  // Duel Challenge Operations
  createDuelChallenge(challenge: InsertDuelChallenge): Promise<DuelChallenge>;
  getDuelChallenge(id: number): Promise<DuelChallenge | undefined>;
  listDuelChallenges(): Promise<DuelChallenge[]>;
  getDuelChallengesByDifficulty(difficulty: string): Promise<DuelChallenge[]>;
  getUserDuelChallenges(userId: number): Promise<DuelChallenge[]>;
  updateDuelChallengeStatus(id: number, status: string): Promise<DuelChallenge | undefined>;
  
  // Duel Match Operations
  createDuelMatch(match: InsertDuelMatch): Promise<DuelMatch>;
  getDuelMatch(id: number): Promise<DuelMatch | undefined>;
  getUserDuelMatches(userId: number): Promise<DuelMatch[]>;
  updateDuelMatch(id: number, matchData: Partial<DuelMatch>): Promise<DuelMatch | undefined>;
  updateDuelMatchStatus(id: number, status: string): Promise<DuelMatch | undefined>;
  setDuelMatchWinner(id: number, winnerId: number, scoreChange: number): Promise<DuelMatch | undefined>;
  getActiveDuelMatch(userId: number): Promise<DuelMatch | undefined>;
  getDockerLabMatch(): Promise<DuelMatch | undefined>;
  
  // Duel Match Challenge Operations
  addChallengeToDuelMatch(matchId: number, challengeId: number): Promise<DuelMatchChallenge>;
  getMatchChallenges(matchId: number): Promise<DuelMatchChallenge[]>;
  markChallengeCompleted(matchId: number, challengeId: number, userId: number): Promise<DuelMatchChallenge | undefined>;
  
  // Duel Image Operations
  createDuelImage(image: InsertDuelImage): Promise<DuelImage>;
  getDuelImage(id: number): Promise<DuelImage | undefined>;
  listDuelImages(): Promise<DuelImage[]>;
  listEnabledDuelImages(): Promise<DuelImage[]>;
  updateDuelImage(id: number, imageData: Partial<DuelImage>): Promise<DuelImage | undefined>;
  toggleDuelImageStatus(id: number, enabled: boolean): Promise<DuelImage | undefined>;
  deleteDuelImage(id: number): Promise<boolean>;
  
  // Duel Terminal Session Operations
  createDuelTerminalSession(session: InsertDuelTerminalSession): Promise<DuelTerminalSession>;
  getDuelTerminalSession(id: number): Promise<DuelTerminalSession | undefined>;
  getDuelTerminalSessionByToken(token: string): Promise<DuelTerminalSession | undefined>;
  getUserActiveDuelTerminalSession(userId: number, matchId: number): Promise<DuelTerminalSession | undefined>;
  getUserActiveDockerLabSessions(userId: number): Promise<DuelTerminalSession[]>;
  updateDuelTerminalSession(id: number, sessionData: Partial<DuelTerminalSession>): Promise<DuelTerminalSession | undefined>;
  updateDuelTerminalSessionActivity(id: number): Promise<DuelTerminalSession | undefined>;
  closeDuelTerminalSession(id: number): Promise<DuelTerminalSession | undefined>;
}

// Database implementation of storage
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  // Variables para el sistema de colas temporal
  private _inQueueUserIds: Set<number>;

  constructor() {
    this.sessionStore = new PostgresStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
    // Inicializar set para la cola
    this._inQueueUserIds = new Set<number>();
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      // Check if categories exist
      const existingCategories = await db.select().from(categories);
      
      if (existingCategories.length === 0) {
        // Sample categories
        await db.insert(categories).values([
          { name: "Web", color: "#00BCD4" },
          { name: "Crypto", color: "#FF5722" },
          { name: "Forensics", color: "#00E676" },
          { name: "Reversing", color: "#9C27B0" },
          { name: "Pwn", color: "#F44336" },
          { name: "Misc", color: "#FF9800" }
        ]);
      }

      // Create default active competition if none exists
      const existingCompetitions = await db.select().from(competitions);
      
      if (existingCompetitions.length === 0) {
        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + 5);
        
        await db.insert(competitions).values([{
          name: "Summer CTF 2023",
          description: "Annual summer capture the flag competition",
          startTime: now,
          endTime: end,
          isActive: true
        }]);
      }
    } catch (error) {
      console.error("Error initializing default data:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure all required fields (including null fields) are properly set
    const userData = {
      ...insertUser,
      teamId: null, // Set explicit null for teamId
      bio: insertUser.bio || null,
      avatarColor: insertUser.avatarColor || null,
      isAdmin: false
    };
    
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.name, name));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    // Ensure all required fields (including null fields) are properly set
    const teamData = {
      ...team,
      description: team.description || null
    };
    
    const [newTeam] = await db.insert(teams).values(teamData).returning();
    return newTeam;
  }

  async updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined> {
    const [updatedTeam] = await db
      .update(teams)
      .set(teamData)
      .where(eq(teams.id, id))
      .returning();
    
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id));
    return result.count > 0;
  }

  async listTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async getTeamMembers(teamId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.teamId, teamId));
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set(categoryData)
      .where(eq(categories.id, id))
      .returning();
    
    return updatedCategory;
  }

  async listCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  // Challenge operations
  async getChallenge(id: number): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    // Ensure all required fields (including null fields) are properly set
    const challengeData = {
      ...challenge,
      resourceUrl: challenge.resourceUrl || null,
      hintText: challenge.hintText || null,
      hintCost: challenge.hintCost || null
    };
    
    const [newChallenge] = await db.insert(challenges).values(challengeData).returning();
    return newChallenge;
  }

  async updateChallenge(id: number, challengeData: Partial<Challenge>): Promise<Challenge | undefined> {
    const [updatedChallenge] = await db
      .update(challenges)
      .set(challengeData)
      .where(eq(challenges.id, id))
      .returning();
    
    return updatedChallenge;
  }

  async deleteChallenge(id: number): Promise<boolean> {
    const result = await db.delete(challenges).where(eq(challenges.id, id));
    return result.count > 0;
  }

  async listChallenges(): Promise<Challenge[]> {
    return await db.select().from(challenges);
  }

  async getChallengesByCategory(categoryId: number): Promise<Challenge[]> {
    return await db.select().from(challenges).where(eq(challenges.categoryId, categoryId));
  }

  // Submission operations
  async getSubmission(id: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    // Check if this is the first solve for this challenge
    const existingSubmissions = await db
      .select()
      .from(submissions)
      .where(eq(submissions.challengeId, submission.challengeId));
    
    const isFirstBlood = existingSubmissions.length === 0;
    
    const [newSubmission] = await db
      .insert(submissions)
      .values({
        ...submission,
        teamId: submission.teamId || null,
        submittedAt: new Date(),
        isFirstBlood
      })
      .returning();
    
    return newSubmission;
  }

  async listSubmissionsByUser(userId: number): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, userId));
  }

  async listSubmissionsByTeam(teamId: number): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.teamId, teamId));
  }

  async listSubmissionsByChallenge(challengeId: number): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.challengeId, challengeId));
  }

  async isChallengeCompletedByUser(userId: number, challengeId: number): Promise<boolean> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, userId),
          eq(submissions.challengeId, challengeId)
        )
      );
    
    return !!submission;
  }

  async isChallengeCompletedByTeam(teamId: number, challengeId: number): Promise<boolean> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.teamId, teamId),
          eq(submissions.challengeId, challengeId)
        )
      );
    
    return !!submission;
  }

  // Hint operations
  async createHintUnlock(hintUnlock: InsertHintUnlock): Promise<HintUnlock> {
    const [newHintUnlock] = await db
      .insert(hintUnlocks)
      .values({
        ...hintUnlock,
        teamId: hintUnlock.teamId || null,
        unlockedAt: new Date()
      })
      .returning();
    
    return newHintUnlock;
  }

  async isHintUnlockedByUser(userId: number, challengeId: number): Promise<boolean> {
    const [hintUnlock] = await db
      .select()
      .from(hintUnlocks)
      .where(
        and(
          eq(hintUnlocks.userId, userId),
          eq(hintUnlocks.challengeId, challengeId)
        )
      );
    
    return !!hintUnlock;
  }

  async isHintUnlockedByTeam(teamId: number, challengeId: number): Promise<boolean> {
    const [hintUnlock] = await db
      .select()
      .from(hintUnlocks)
      .where(
        and(
          eq(hintUnlocks.teamId, teamId),
          eq(hintUnlocks.challengeId, challengeId)
        )
      );
    
    return !!hintUnlock;
  }

  // Competition operations
  async getCompetition(id: number): Promise<Competition | undefined> {
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, id));
    
    return competition;
  }

  async getActiveCompetition(): Promise<Competition | undefined> {
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.isActive, true));
    
    return competition;
  }

  async createCompetition(competition: InsertCompetition): Promise<Competition> {
    // Ensure all required fields (including null fields) are properly set
    const competitionData = {
      ...competition,
      description: competition.description || null,
      isActive: competition.isActive !== undefined ? competition.isActive : false
    };
    
    const [newCompetition] = await db
      .insert(competitions)
      .values(competitionData)
      .returning();
    
    return newCompetition;
  }

  async updateCompetition(id: number, competitionData: Partial<Competition>): Promise<Competition | undefined> {
    const [updatedCompetition] = await db
      .update(competitions)
      .set(competitionData)
      .where(eq(competitions.id, id))
      .returning();
    
    return updatedCompetition;
  }

  async addChallengeToCompetition(competitionId: number, challengeId: number): Promise<CompetitionChallenge> {
    const [competitionChallenge] = await db
      .insert(competitionChallenges)
      .values({ competitionId, challengeId })
      .returning();
    
    return competitionChallenge;
  }

  // Team Join Request operations
  async createTeamJoinRequest(request: InsertTeamJoinRequest): Promise<TeamJoinRequest> {
    const [newRequest] = await db
      .insert(teamJoinRequests)
      .values({
        ...request,
        requestedAt: new Date(),
        status: "pending"
      })
      .returning();
    
    return newRequest;
  }

  async updateTeamJoinRequest(id: number, status: string): Promise<TeamJoinRequest | undefined> {
    const [updatedRequest] = await db
      .update(teamJoinRequests)
      .set({ status })
      .where(eq(teamJoinRequests.id, id))
      .returning();
    
    return updatedRequest;
  }

  async getTeamJoinRequests(teamId: number): Promise<TeamJoinRequest[]> {
    return await db
      .select()
      .from(teamJoinRequests)
      .where(
        and(
          eq(teamJoinRequests.teamId, teamId),
          eq(teamJoinRequests.status, "pending")
        )
      );
  }

  async getUserTeamJoinRequests(userId: number): Promise<TeamJoinRequest[]> {
    return await db
      .select()
      .from(teamJoinRequests)
      .where(eq(teamJoinRequests.userId, userId));
  }

  // Scoreboard operations
  async getUserScore(userId: number): Promise<number> {
    const userSubmissions = await this.listSubmissionsByUser(userId);
    
    // Create array of unique challenge IDs
    const challengeIdsMap: {[key: number]: boolean} = {};
    userSubmissions.forEach(submission => {
      challengeIdsMap[submission.challengeId] = true;
    });
    
    const challengeIds = Object.keys(challengeIdsMap).map(id => parseInt(id));
    
    // Get score from challenges
    let totalScore = 0;
    for (const challengeId of challengeIds) {
      const challenge = await this.getChallenge(challengeId);
      if (challenge) {
        totalScore += challenge.points;
      }
    }
    
    return totalScore;
  }

  async getTeamScore(teamId: number): Promise<number> {
    const teamSubmissions = await this.listSubmissionsByTeam(teamId);
    
    // Create array of unique challenge IDs
    const challengeIdsMap: {[key: number]: boolean} = {};
    teamSubmissions.forEach(submission => {
      challengeIdsMap[submission.challengeId] = true;
    });
    
    const challengeIds = Object.keys(challengeIdsMap).map(id => parseInt(id));
    
    // Get score from challenges
    let totalScore = 0;
    for (const challengeId of challengeIds) {
      const challenge = await this.getChallenge(challengeId);
      if (challenge) {
        totalScore += challenge.points;
      }
    }
    
    return totalScore;
  }

  async getUserScoreboard(): Promise<{ userId: number, username: string, score: number }[]> {
    const allUsers = await this.listUsers();
    
    const userScores = await Promise.all(
      allUsers.map(async user => {
        const score = await this.getUserScore(user.id);
        return {
          userId: user.id,
          username: user.username,
          score
        };
      })
    );
    
    // Sort by score descending
    return userScores.sort((a, b) => b.score - a.score);
  }

  async getTeamScoreboard(): Promise<{ teamId: number, teamName: string, score: number }[]> {
    const allTeams = await this.listTeams();
    
    const teamScores = await Promise.all(
      allTeams.map(async team => {
        const score = await this.getTeamScore(team.id);
        return {
          teamId: team.id,
          teamName: team.name,
          score
        };
      })
    );
    
    // Sort by score descending
    return teamScores.sort((a, b) => b.score - a.score);
  }

  // Duel Stats Operations
  async getDuelStats(userId: number): Promise<UsersDuelStats | undefined> {
    const [stats] = await db
      .select()
      .from(usersDuelStats)
      .where(eq(usersDuelStats.userId, userId));
    
    return stats;
  }

  async createDuelStats(stats: InsertUsersDuelStats): Promise<UsersDuelStats> {
    const now = new Date();
    const statsWithDefaults = {
      ...stats,
      duelWins: stats.duelWins || 0,
      duelLosses: stats.duelLosses || 0,
      duelRating: stats.duelRating || 1000,
      duelLastPlayed: now
    };
    
    const [newStats] = await db
      .insert(usersDuelStats)
      .values(statsWithDefaults)
      .returning();
    
    return newStats;
  }

  async updateDuelStats(userId: number, win: boolean, ratingChange: number): Promise<UsersDuelStats | undefined> {
    // Get current stats
    let stats = await this.getDuelStats(userId);
    
    if (!stats) {
      // Create stats if they don't exist
      stats = await this.createDuelStats({ 
        userId,
        duelWins: 0,
        duelLosses: 0,
        duelRating: 1000
      });
    }
    
    // Update stats
    const now = new Date();
    const newRating = Math.max(0, stats.duelRating + (win ? ratingChange : -ratingChange));
    
    const [updatedStats] = await db
      .update(usersDuelStats)
      .set({
        duelWins: win ? stats.duelWins + 1 : stats.duelWins,
        duelLosses: win ? stats.duelLosses : stats.duelLosses + 1,
        duelRating: newRating,
        duelLastPlayed: now
      })
      .where(eq(usersDuelStats.userId, userId))
      .returning();
    
    return updatedStats;
  }

  async getDuelLeaderboard(): Promise<{ userId: number, username: string, rating: number, wins: number, losses: number }[]> {
    // Get all users with duel stats
    const allStats = await db.select().from(usersDuelStats);
    
    // Get user details
    const leaderboard = await Promise.all(
      allStats.map(async stats => {
        const user = await this.getUser(stats.userId);
        return {
          userId: stats.userId,
          username: user ? user.username : 'Unknown',
          rating: stats.duelRating,
          wins: stats.duelWins,
          losses: stats.duelLosses
        };
      })
    );
    
    // Sort by rating descending
    return leaderboard.sort((a, b) => b.rating - a.rating);
  }

  // Duel Queue Operations
  async enqueueDuelRequest(request: InsertDuelQueue): Promise<DuelQueue> {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMinutes(now.getMinutes() + 5); // 5 minute expiration
    
    // Create duel queue entry
    try {
      const [queueEntry] = await db
        .insert(duelQueue)
        .values({
          userId: request.userId,
          preferredDifficulty: request.preferredDifficulty || 'any',
          preferredChallengeType: request.preferredChallengeType || 'any',
          joinedAt: now,
          status: "waiting",
          expiresAt
        })
        .returning();
      
      return queueEntry;
    } catch (error) {
      console.error("Error al encolar solicitud de duelo:", error);
      throw error;
    }
  }

  async dequeueUserFromDuelQueue(userId: number): Promise<boolean> {
    try {
      // Uso del set en memoria para simular una cola real
      console.log(`Eliminando usuario ${userId} de la cola (solución temporal sin persistencia)`);
      
      // Eliminar el usuario del set en memoria
      const removed = this._inQueueUserIds.delete(userId);
      
      console.log(`Usuario ${userId} ${removed ? 'eliminado con éxito' : 'no estaba'} en la cola`);
      
      return true;
    } catch (error) {
      console.error("Error al eliminar usuario de la cola:", error);
      return false;
    }
  }

  async getUserDuelQueueStatus(userId: number): Promise<DuelQueue | undefined> {
    const now = new Date();
    
    try {
      // Get user's active queue entry - evitamos cualquier columna que pueda no existir
      // Seleccionamos columnas específicas para evitar el problema
      const [queueEntry] = await db
        .select({
          id: duelQueue.id,
          userId: duelQueue.userId,
          joinedAt: duelQueue.joinedAt,
          status: duelQueue.status,
          preferredDifficulty: duelQueue.preferredDifficulty,
          preferredChallengeType: duelQueue.preferredChallengeType,
          expiresAt: duelQueue.expiresAt
        })
        .from(duelQueue)
        .where(
          and(
            eq(duelQueue.userId, userId),
            inArray(duelQueue.status, ['waiting', 'matching'])
          )
        );
      
      // Check if entry exists and is not expired
      if (queueEntry && queueEntry.expiresAt > now) {
        // Añadir tipo de desafío preferido si no existe en la BD
        const result = {
          ...queueEntry,
          preferredChallengeType: queueEntry.preferredChallengeType || "any"
        };
        return result;
      }
      
      return undefined;
    } catch (error) {
      console.error("Error al obtener estado de cola:", error);
      return undefined;
    }
  }

  async isUserInQueue(userId: number): Promise<boolean> {
    try {
      // Verificar si el usuario está en el set de usuarios en cola
      console.log(`Verificando si el usuario ${userId} está en cola (solución temporal)`);
      
      // Usar el set de memoria que creamos para simular persistencia
      const inQueue = this._inQueueUserIds.has(userId);
      
      console.log(`Usuario ${userId} ${inQueue ? 'está' : 'no está'} en la cola`);
      return inQueue;
    } catch (error) {
      console.error("Error al verificar si el usuario está en cola:", error);
      // En caso de error, asumimos que no está en la cola para evitar problemas
      return false;
    }
  }
  
  // Método de conveniencia para añadir usuario a la cola con opciones predeterminadas
  async addToQueue(userId: number): Promise<DuelQueue> {
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setMinutes(now.getMinutes() + 10); // 10 minutos de expiración
    
    // Solución temporal - crear un objeto simulado en lugar de intentar la inserción
    // Esto evitará el error pero no permitirá funcionalidad real hasta que se arregle la base de datos
    try {
      console.log(`Añadiendo usuario ${userId} a la cola (solución temporal sin persistencia)`);
      
      // Guardamos el ID de usuario en la cola en memoria
      this._inQueueUserIds = this._inQueueUserIds || new Set();
      this._inQueueUserIds.add(userId);
      
      // Simulamos un objeto de cola con la estructura básica que se espera
      const mockQueueEntry: DuelQueue = {
        id: Math.floor(Math.random() * 1000), // ID aleatorio simulado
        userId,
        joinedAt: now,
        status: "waiting",
        preferredDifficulty: "any",
        preferredChallengeType: "any", // Incluimos este campo aunque no exista en la BD
        expiresAt
      };
      
      return mockQueueEntry;
    } catch (error) {
      console.error("Error al añadir usuario a la cola:", error);
      throw error;
    }
  }
  
  // Alias para dequeueUserFromDuelQueue por compatibilidad
  async removeFromQueue(userId: number): Promise<boolean> {
    return await this.dequeueUserFromDuelQueue(userId);
  }
  
  // Método que encuentra emparejamiento y devuelve formato simplificado
  async matchUsersFromQueue(): Promise<{ player1Id: number, player2Id: number } | null> {
    const match = await this.findDuelMatch();
    if (!match) return null;
    
    return {
      player1Id: match.player1.userId,
      player2Id: match.player2.userId
    };
  }

  async findDuelMatch(): Promise<{ player1: DuelQueue, player2: DuelQueue } | null> {
    // Solución temporal - simular que no hay coincidencias
    // Esto evitará los errores de BD pero no permitirá emparejamientos reales
    try {
      console.log("Buscando coincidencias para duelo (solución temporal sin persistencia)");
      // En esta versión temporal siempre devolvemos null para indicar que no hay coincidencias
      // Esto permitirá que la funcionalidad de unirse a la cola no genere errores
      // pero no permitirá emparejamientos hasta que se solucione el problema de BD
      return null;
    } catch (error) {
      console.error("Error al buscar coincidencia para duelo:", error);
      return null;
    }
  }

  // Duel Challenge Operations
  async createDuelChallenge(challenge: InsertDuelChallenge): Promise<DuelChallenge> {
    const [newChallenge] = await db
      .insert(duelChallenges)
      .values(challenge)
      .returning();
    
    return newChallenge;
  }

  async getDuelChallenge(id: number): Promise<DuelChallenge | undefined> {
    const [challenge] = await db
      .select()
      .from(duelChallenges)
      .where(eq(duelChallenges.id, id));
    
    return challenge;
  }

  async listDuelChallenges(): Promise<DuelChallenge[]> {
    return await db
      .select()
      .from(duelChallenges);
  }

  async getDuelChallengesByDifficulty(difficulty: string): Promise<DuelChallenge[]> {
    return await db
      .select()
      .from(duelChallenges)
      .where(eq(duelChallenges.difficulty, difficulty));
  }
  
  async getUserDuelChallenges(userId: number): Promise<DuelChallenge[]> {
    return await db
      .select()
      .from(duelChallenges)
      .where(
        or(
          eq(duelChallenges.challengerId, userId),
          eq(duelChallenges.challengedId, userId)
        )
      );
  }
  
  async updateDuelChallengeStatus(id: number, status: string): Promise<DuelChallenge | undefined> {
    const [updatedChallenge] = await db
      .update(duelChallenges)
      .set({ status })
      .where(eq(duelChallenges.id, id))
      .returning();
      
    return updatedChallenge;
  }

  // Duel Match Operations
  async createDuelMatch(match: InsertDuelMatch): Promise<DuelMatch> {
    const [newMatch] = await db
      .insert(duelMatches)
      .values({
        ...match,
        status: "preparing",
        startedAt: new Date(),
        endedAt: null,
        winnerId: null,
        duelImageId: null,
        containerData: null,
        scoreChange: null,
        logs: null,
        webTerminalEnabled: false
      })
      .returning();
      
    return newMatch;
  }
  
  async getDuelMatch(id: number): Promise<DuelMatch | undefined> {
    const [match] = await db
      .select()
      .from(duelMatches)
      .where(eq(duelMatches.id, id));
      
    return match;
  }
  
  async getUserDuelMatches(userId: number): Promise<DuelMatch[]> {
    return await db
      .select()
      .from(duelMatches)
      .where(
        or(
          eq(duelMatches.player1Id, userId),
          eq(duelMatches.player2Id, userId)
        )
      );
  }
  
  async updateDuelMatch(id: number, matchData: Partial<DuelMatch>): Promise<DuelMatch | undefined> {
    const [updatedMatch] = await db
      .update(duelMatches)
      .set(matchData)
      .where(eq(duelMatches.id, id))
      .returning();
      
    return updatedMatch;
  }
  
  async updateDuelMatchStatus(id: number, status: string): Promise<DuelMatch | undefined> {
    const [updatedMatch] = await db
      .update(duelMatches)
      .set({ status })
      .where(eq(duelMatches.id, id))
      .returning();
      
    return updatedMatch;
  }
  
  async setDuelMatchWinner(id: number, winnerId: number, scoreChange: number): Promise<DuelMatch | undefined> {
    const match = await this.getDuelMatch(id);
    if (!match) return undefined;
    
    const winnerStatus = match.player1Id === winnerId ? "player1_victory" : "player2_victory";
    
    const [updatedMatch] = await db
      .update(duelMatches)
      .set({
        status: winnerStatus,
        endedAt: new Date(),
        winnerId,
        scoreChange
      })
      .where(eq(duelMatches.id, id))
      .returning();
      
    // Actualizar estadísticas de los jugadores
    const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
    await this.updateDuelStats(winnerId, true, scoreChange);
    await this.updateDuelStats(loserId, false, scoreChange);
    
    return updatedMatch;
  }
  
  async getActiveDuelMatch(userId: number): Promise<DuelMatch | undefined> {
    const activeStates = ["preparing", "in_progress"];
    
    const [match] = await db
      .select()
      .from(duelMatches)
      .where(
        and(
          or(
            eq(duelMatches.player1Id, userId),
            eq(duelMatches.player2Id, userId)
          ),
          inArray(duelMatches.status, activeStates)
        )
      );
      
    return match;
  }
  
  // Obtener la partida especial para Docker Lab
  async getDockerLabMatch(): Promise<DuelMatch | undefined> {
    try {
      const [match] = await db
        .select()
        .from(duelMatches)
        .where(
          and(
            eq(duelMatches.status, "docker_lab"),
            eq(duelMatches.player1Id, 0),
            eq(duelMatches.player2Id, 0)
          )
        );
        
      return match;
    } catch (error) {
      console.error("Error al obtener partida de Docker Lab:", error);
      return undefined;
    }
  }

  // Duel Match Challenge Operations
  async addChallengeToDuelMatch(matchId: number, challengeId: number): Promise<DuelMatchChallenge> {
    const [matchChallenge] = await db
      .insert(duelMatchChallenges)
      .values({
        matchId,
        challengeId,
        player1Completed: false,
        player2Completed: false
      })
      .returning();
    
    return matchChallenge;
  }

  async getMatchChallenges(matchId: number): Promise<DuelMatchChallenge[]> {
    return await db
      .select()
      .from(duelMatchChallenges)
      .where(eq(duelMatchChallenges.matchId, matchId));
  }

  async markChallengeCompleted(matchId: number, challengeId: number, userId: number): Promise<DuelMatchChallenge | undefined> {
    // Get match to determine which player completed
    const match = await this.getDuelMatch(matchId);
    if (!match) return undefined;
    
    // Get match challenge
    const [matchChallenge] = await db
      .select()
      .from(duelMatchChallenges)
      .where(
        and(
          eq(duelMatchChallenges.matchId, matchId),
          eq(duelMatchChallenges.challengeId, challengeId)
        )
      );
    
    if (!matchChallenge) return undefined;
    
    // Determine which player completed
    const isPlayer1 = match.player1Id === userId;
    const isPlayer2 = match.player2Id === userId;
    
    if (!isPlayer1 && !isPlayer2) return undefined;
    
    // Update the correct player's completion status
    const updateData = isPlayer1 
      ? { player1Completed: true }
      : { player2Completed: true };
    
    const [updatedChallenge] = await db
      .update(duelMatchChallenges)
      .set(updateData)
      .where(
        and(
          eq(duelMatchChallenges.matchId, matchId),
          eq(duelMatchChallenges.challengeId, challengeId)
        )
      )
      .returning();
    
    return updatedChallenge;
  }

  // Duel Image Operations
  async createDuelImage(image: InsertDuelImage): Promise<DuelImage> {
    const [newImage] = await db
      .insert(duelImages)
      .values({
        ...image,
        createdAt: new Date(),
        isEnabled: image.isEnabled !== undefined ? image.isEnabled : true,
        addedByAdminId: image.addedByAdminId || null,
        description: image.description || null
      })
      .returning();
    
    return newImage;
  }

  async getDuelImage(id: number): Promise<DuelImage | undefined> {
    const [image] = await db
      .select()
      .from(duelImages)
      .where(eq(duelImages.id, id));
    
    return image;
  }

  async listDuelImages(): Promise<DuelImage[]> {
    return await db
      .select()
      .from(duelImages);
  }

  async listEnabledDuelImages(): Promise<DuelImage[]> {
    return await db
      .select()
      .from(duelImages)
      .where(eq(duelImages.isEnabled, true));
  }

  async updateDuelImage(id: number, imageData: Partial<DuelImage>): Promise<DuelImage | undefined> {
    const [updatedImage] = await db
      .update(duelImages)
      .set(imageData)
      .where(eq(duelImages.id, id))
      .returning();
    
    return updatedImage;
  }

  async toggleDuelImageStatus(id: number, enabled: boolean): Promise<DuelImage | undefined> {
    const [updatedImage] = await db
      .update(duelImages)
      .set({ isEnabled: enabled })
      .where(eq(duelImages.id, id))
      .returning();
    
    return updatedImage;
  }
  
  async deleteDuelImage(id: number): Promise<boolean> {
    const result = await db.delete(duelImages).where(eq(duelImages.id, id));
    return result.count > 0;
  }

  // Duel Terminal Session Operations
  async createDuelTerminalSession(session: InsertDuelTerminalSession): Promise<DuelTerminalSession> {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(now.getHours() + 2); // 2 hour expiration
    
    const [newSession] = await db
      .insert(duelTerminalSessions)
      .values({
        ...session,
        createdAt: now,
        lastActivityAt: now,
        expiresAt,
        isActive: true
      })
      .returning();
    
    return newSession;
  }

  async getDuelTerminalSession(id: number): Promise<DuelTerminalSession | undefined> {
    const [session] = await db
      .select()
      .from(duelTerminalSessions)
      .where(eq(duelTerminalSessions.id, id));
    
    return session;
  }

  async getDuelTerminalSessionByToken(token: string): Promise<DuelTerminalSession | undefined> {
    const [session] = await db
      .select()
      .from(duelTerminalSessions)
      .where(eq(duelTerminalSessions.token, token));
    
    return session;
  }

  async getUserActiveDuelTerminalSession(userId: number, matchId: number): Promise<DuelTerminalSession | undefined> {
    const [session] = await db
      .select()
      .from(duelTerminalSessions)
      .where(
        and(
          eq(duelTerminalSessions.userId, userId),
          eq(duelTerminalSessions.matchId, matchId),
          eq(duelTerminalSessions.isActive, true)
        )
      );
    
    return session;
  }
  
  // Obtener sesiones activas del usuario en Docker Lab
  async getUserActiveDockerLabSessions(userId: number): Promise<DuelTerminalSession[]> {
    try {
      // Obtener la partida especial de Docker Lab
      const labMatch = await this.getDockerLabMatch();
      
      if (!labMatch) {
        return [];
      }
      
      // Obtener sesiones donde matchId = labMatch.id y están activas
      const sessions = await db
        .select()
        .from(duelTerminalSessions)
        .where(
          and(
            eq(duelTerminalSessions.userId, userId),
            eq(duelTerminalSessions.matchId, labMatch.id),
            eq(duelTerminalSessions.isActive, true)
          )
        );
      
      return sessions;
    } catch (error) {
      console.error("Error al obtener sesiones activas de Docker Lab:", error);
      return [];
    }
  }

  async updateDuelTerminalSession(id: number, sessionData: Partial<DuelTerminalSession>): Promise<DuelTerminalSession | undefined> {
    const [updatedSession] = await db
      .update(duelTerminalSessions)
      .set(sessionData)
      .where(eq(duelTerminalSessions.id, id))
      .returning();
    
    return updatedSession;
  }

  async updateDuelTerminalSessionActivity(id: number): Promise<DuelTerminalSession | undefined> {
    const now = new Date();
    
    const [updatedSession] = await db
      .update(duelTerminalSessions)
      .set({ lastActivityAt: now })
      .where(eq(duelTerminalSessions.id, id))
      .returning();
    
    return updatedSession;
  }

  async closeDuelTerminalSession(id: number): Promise<DuelTerminalSession | undefined> {
    const [closedSession] = await db
      .update(duelTerminalSessions)
      .set({ isActive: false })
      .where(eq(duelTerminalSessions.id, id))
      .returning();
    
    return closedSession;
  }
}

// Export an instance of the storage implementation
export const storage = new DatabaseStorage();