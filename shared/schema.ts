import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  bio: text("bio"),
  avatarColor: text("avatar_color"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  teamId: integer("team_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  bio: true,
  avatarColor: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Team schema
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  captainId: integer("captain_id").notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  description: true,
  captainId: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Category schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  color: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Challenge schema
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  points: integer("points").notNull(),
  flag: text("flag").notNull(),
  resourceUrl: text("resource_url"),
  categoryId: integer("category_id").notNull(),
  hintText: text("hint_text"),
  hintCost: integer("hint_cost").default(50),
});

export const insertChallengeSchema = createInsertSchema(challenges).pick({
  title: true,
  description: true,
  points: true,
  flag: true,
  resourceUrl: true,
  categoryId: true,
  hintText: true,
  hintCost: true,
});

export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;

// Submission schema - records of solved challenges
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  teamId: integer("team_id"),
  challengeId: integer("challenge_id").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  isFirstBlood: boolean("is_first_blood").default(false).notNull(),
});

export const insertSubmissionSchema = createInsertSchema(submissions).pick({
  userId: true,
  teamId: true,
  challengeId: true,
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

// HintUnlock schema - records of hints that have been unlocked
export const hintUnlocks = pgTable("hint_unlocks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  teamId: integer("team_id"),
  challengeId: integer("challenge_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
});

export const insertHintUnlockSchema = createInsertSchema(hintUnlocks).pick({
  userId: true,
  teamId: true,
  challengeId: true,
});

export type InsertHintUnlock = z.infer<typeof insertHintUnlockSchema>;
export type HintUnlock = typeof hintUnlocks.$inferSelect;

// Competition schema
export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertCompetitionSchema = createInsertSchema(competitions).pick({
  name: true,
  description: true,
  startTime: true,
  endTime: true,
  isActive: true,
});

export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitions.$inferSelect;

// CompetitionChallenge - many-to-many relation between competitions and challenges
export const competitionChallenges = pgTable("competition_challenges", {
  competitionId: integer("competition_id").notNull(),
  challengeId: integer("challenge_id").notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.competitionId, table.challengeId] }),
  };
});

export const insertCompetitionChallengeSchema = createInsertSchema(competitionChallenges);

export type InsertCompetitionChallenge = z.infer<typeof insertCompetitionChallengeSchema>;
export type CompetitionChallenge = typeof competitionChallenges.$inferSelect;

// TeamJoinRequest schema
export const teamJoinRequests = pgTable("team_join_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  teamId: integer("team_id").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: text("status").default("pending").notNull(), // pending, accepted, rejected
});

export const insertTeamJoinRequestSchema = createInsertSchema(teamJoinRequests).pick({
  userId: true,
  teamId: true,
});

export type InsertTeamJoinRequest = z.infer<typeof insertTeamJoinRequestSchema>;
export type TeamJoinRequest = typeof teamJoinRequests.$inferSelect;

// Docker Duel schema

// Actualizar tabla users con campos para duelos
export const usersDuelStats = pgTable("users_duel_stats", {
  userId: integer("user_id").primaryKey(),
  duelWins: integer("duel_wins").default(0).notNull(),
  duelLosses: integer("duel_losses").default(0).notNull(),
  duelRating: integer("duel_rating").default(1000).notNull(),
  duelLastPlayed: timestamp("duel_last_played"),
});

export const insertUsersDuelStatsSchema = createInsertSchema(usersDuelStats).pick({
  userId: true,
  duelWins: true,
  duelLosses: true,
  duelRating: true,
  duelLastPlayed: true,
});

export type InsertUsersDuelStats = z.infer<typeof insertUsersDuelStatsSchema>;
export type UsersDuelStats = typeof usersDuelStats.$inferSelect;

// Cola de espera para duelos
export const duelQueue = pgTable("duel_queue", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  status: text("status").default("waiting").notNull(), // waiting, matching
  preferredDifficulty: text("preferred_difficulty").default("any").notNull(),
  preferredChallengeType: text("preferred_challenge_type").default("any").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertDuelQueueSchema = createInsertSchema(duelQueue).pick({
  userId: true,
  preferredDifficulty: true,
  preferredChallengeType: true,
});

export type InsertDuelQueue = z.infer<typeof insertDuelQueueSchema>;
export type DuelQueue = typeof duelQueue.$inferSelect;

// Desafíos directos entre jugadores
export const duelChallenges = pgTable("duel_challenges", {
  id: serial("id").primaryKey(),
  challengerId: integer("challenger_id").notNull(),
  challengedId: integer("challenged_id").notNull(),
  status: text("status").default("pending").notNull(), // pending, accepted, rejected, expired
  difficulty: text("difficulty").default("medium").notNull(), // easy, medium, hard
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertDuelChallengeSchema = createInsertSchema(duelChallenges).pick({
  challengerId: true,
  challengedId: true,
  expiresAt: true,
  difficulty: true,
  status: true,
});

export type InsertDuelChallenge = z.infer<typeof insertDuelChallengeSchema>;
export type DuelChallenge = typeof duelChallenges.$inferSelect;

// Partidas de duelo
export const duelMatches = pgTable("duel_matches", {
  id: serial("id").primaryKey(),
  player1Id: integer("player1_id").notNull(),
  player2Id: integer("player2_id").notNull(),
  status: text("status").default("preparing").notNull(), // preparing, in_progress, player1_victory, player2_victory, draw, error
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  winnerId: integer("winner_id"),
  duelImageId: integer("duel_image_id").references(() => duelImages.id),
  containerData: json("container_data").$type<{
    player1Container: string,
    player2Container: string,
    networkId: string,
    player1Ip: string,
    player2Ip: string
  }>(),
  scoreChange: integer("score_change"),
  logs: text("logs"),
  webTerminalEnabled: boolean("web_terminal_enabled").default(false).notNull(),
});

export const insertDuelMatchSchema = createInsertSchema(duelMatches).pick({
  player1Id: true,
  player2Id: true,
  status: true,
});

export type InsertDuelMatch = z.infer<typeof insertDuelMatchSchema>;
export type DuelMatch = typeof duelMatches.$inferSelect;

// Relación entre partida de duelo y su desafío (si lo hubo)
export const duelMatchChallenges = pgTable("duel_match_challenges", {
  matchId: integer("match_id").notNull(),
  challengeId: integer("challenge_id").notNull(),
  player1Completed: boolean("player1_completed").default(false).notNull(),
  player2Completed: boolean("player2_completed").default(false).notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.matchId, table.challengeId] }),
  };
});

export const insertDuelMatchChallengeSchema = createInsertSchema(duelMatchChallenges).pick({
  matchId: true,
  challengeId: true,
  player1Completed: true,
  player2Completed: true,
});

export type InsertDuelMatchChallenge = z.infer<typeof insertDuelMatchChallengeSchema>;
export type DuelMatchChallenge = typeof duelMatchChallenges.$inferSelect;

// Imágenes Docker para los duelos
export const duelImages = pgTable("duel_images", {
  id: serial("id").primaryKey(),
  imageTag: text("image_tag").notNull().unique(), // Ej: "cyberchallenge/duel-kali-web:v1"
  name: text("name").notNull(),                   // Ej: "Reto Web Básico"
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  addedByAdminId: integer("added_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dockerImage: text("docker_image"), // Ej: "kalilinux/kali-rolling" (para inicializar el contenedor real)
});

export const insertDuelImageSchema = createInsertSchema(duelImages).omit({
  id: true,
  createdAt: true,
});

export type InsertDuelImage = z.infer<typeof insertDuelImageSchema>;
export type DuelImage = typeof duelImages.$inferSelect;

// Sesiones de terminal web para los duelos
export const duelTerminalSessions = pgTable("duel_terminal_sessions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => duelMatches.id),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  containerId: text("container_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivityAt: timestamp("last_activity_at"),
});

export const insertDuelTerminalSessionSchema = createInsertSchema(duelTerminalSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertDuelTerminalSession = z.infer<typeof insertDuelTerminalSessionSchema>;
export type DuelTerminalSession = typeof duelTerminalSessions.$inferSelect;
