-- Insert sample Accounts
INSERT INTO Accounts (Username, Password, xp, pfp, CurDate, Quest1, Quest2, Quest3)
VALUES 
('alice123', 'hashedpass1', 120, NULL, '2025-04-10', 1, 0, 2),
('bob_the_builder', 'hashedpass2', 300, NULL, '2025-04-09', 3, 1, 1),
('charlie_zen', 'hashedpass3', 50, NULL, '2025-04-08', 0, 0, 0),
('dana_dev', 'hashedpass4', 220, NULL, '2025-04-10', 2, 2, 2);

-- Insert sample friendships
INSERT INTO AccountFriends (AccountID, FriendID)
VALUES 
(1, 2),
(2, 1),
(1, 3),
(3, 1),
(2, 4),
(4, 2);

-- Insert sample Exercises
INSERT INTO Exercises (Date, ExerciseName, ExerciseXP, TimeQuant, Amount)
VALUES 
('2025-04-08', 'Running', 50, TRUE, 30),
('2025-04-08', 'Push-ups', 20, FALSE, 50),
('2025-04-09', 'Jump Rope', 30, TRUE, 15),
('2025-04-10', 'Cycling', 60, TRUE, 45);

-- Insert sample UserExercises
INSERT INTO UserExercises (AccountID, ExerciseID)
VALUES 
(1, 1),
(1, 2),
(2, 3),
(3, 2),
(4, 1),
(4, 4);

-- Insert sample Goals
INSERT INTO Goals (AccountID, Description, Deadline, Completion)
VALUES 
(1, 'Run 5k every day for a week', '2025-04-15', FALSE),
(2, 'Do 100 push-ups daily', '2025-04-20', TRUE),
(3, 'Lose 5 pounds in a month', '2025-05-01', FALSE),
(4, 'Bike 50 miles total', '2025-04-30', FALSE);

-- Insert sample Bosses
INSERT INTO Boss (Name, HP, MaxHP, Pic, RewardXP, Deadline)
VALUES 
('Gains Goblin', 500, 500, NULL, 100, '2025-04-18'),
('Cardio Kraken', 800, 800, NULL, 150, '2025-04-18'),
('Stretch Serpent', 300, 300, NULL, 80, '2025-04-18'),
('Iron Titan', 1000, 1000, NULL, 200, '2025-04-18');
