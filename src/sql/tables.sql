DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS nutrition_adjustments CASCADE;
DROP TABLE IF EXISTS nutrition_plans CASCADE;
DROP TABLE IF EXISTS weight_logs CASCADE;
DROP TABLE IF EXISTS exercise_prs CASCADE;
DROP TABLE IF EXISTS meal_logs CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS workout_logs CASCADE;
DROP TABLE IF EXISTS progress_logs CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS user_streaks CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ai_meal_plans CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verify_token TEXT,
    email_verify_expires TIMESTAMP,
    email_otp TEXT,
    email_otp_expires TIMESTAMP,
    email_otp_attempts INT DEFAULT 0,
    reset_token TEXT,
    reset_token_expires TIMESTAMP,
    reset_otp TEXT,
    reset_otp_expires TIMESTAMP,
    reset_otp_attempts INT DEFAULT 0,
    has_completed_onboarding BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    age INT,
    gender VARCHAR(10),
    height_cm INT,
    weight_kg DOUBLE PRECISION,
    activity_level VARCHAR(50),
    goal VARCHAR(50),
    medical_conditions JSONB,
    diet_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id),
    CHECK (diet_type IN ('veg','non_veg','eggetarian')),
    CHECK (gender IN ('male','female','other')),
    CHECK (age >= 13 AND age <= 80),
    CHECK (height_cm >= 100 AND height_cm <= 250),
    CHECK (weight_kg >= 30 AND weight_kg <= 250)
);

CREATE TABLE plans (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_plan    JSONB NOT NULL,
    meal_plan       JSONB NOT NULL,
    habits          JSONB,
    generated_at    TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,
    duration_weeks  INT DEFAULT 4,
    goals           TEXT,
    metadata        JSONB,
    mesocycle_week  INT DEFAULT 1,
    started_at      DATE DEFAULT CURRENT_DATE
);
CREATE UNIQUE INDEX unique_active_plan_per_user ON plans(user_id) WHERE is_active = TRUE;

CREATE TABLE meals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    calories INT NOT NULL CHECK (calories >= 0),
    macros JSONB NOT NULL,
    cuisine VARCHAR(50),
    diet_type VARCHAR(20) CHECK (diet_type IN ('veg','non_veg','eggetarian')),
    tags JSONB
);
CREATE INDEX idx_meals_name ON meals(name);
CREATE INDEX idx_meals_cuisine ON meals(cuisine);
CREATE INDEX idx_meals_diet_type ON meals(diet_type);

CREATE TABLE meal_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_id INT REFERENCES meals(id) ON DELETE SET NULL,
    meal_type VARCHAR(20) NOT NULL,
    source VARCHAR(20) NOT NULL,
    meal_name VARCHAR(150) NOT NULL,
    calories_consumed INT NOT NULL CHECK (calories_consumed >= 0),
    protein_g NUMERIC(6,2) NOT NULL CHECK (protein_g >= 0),
    carbs_g NUMERIC(6,2) NOT NULL CHECK (carbs_g >= 0),
    fats_g NUMERIC(6,2) NOT NULL CHECK (fats_g >= 0),
    consumed_at TIMESTAMP NOT NULL,
    log_date DATE NOT NULL,
    notes TEXT,
    plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
    week INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, log_date, meal_type)
);
CREATE INDEX idx_meal_logs_meal_type ON meal_logs(meal_type);
CREATE INDEX idx_meal_logs_plan_id ON meal_logs(plan_id);
CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, log_date);
CREATE INDEX idx_meal_logs_week ON meal_logs(week);

CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    muscle_group VARCHAR(50),
    difficulty VARCHAR(20),
    equipment VARCHAR(50),
    contraindications JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group);

CREATE TABLE workout_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    exercise_name VARCHAR(100) NOT NULL,
    sets_completed INT CHECK (sets_completed >= 0),
    reps_completed INT CHECK (reps_completed >= 0),
    weight_used DECIMAL(6,2) CHECK (weight_used >= 0),
    duration_minutes INT CHECK (duration_minutes >= 0),
    perceived_exertion INT CHECK (perceived_exertion BETWEEN 1 AND 10),
    fatigue_level INT CHECK (fatigue_level BETWEEN 1 AND 10),
    notes TEXT,
    all_sets_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_workout_logs_user_date ON workout_logs(user_id, workout_date DESC);

CREATE TABLE exercise_prs (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_name VARCHAR(100) NOT NULL,
    best_1rm      DECIMAL(6,2),
    best_weight   DECIMAL(6,2),
    best_reps     INT,
    achieved_at   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, exercise_name)
);
CREATE INDEX idx_exercise_prs_user ON exercise_prs(user_id, achieved_at DESC);

CREATE TABLE progress_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg DECIMAL(5,2) CHECK (weight_kg > 0),
    body_fat_percentage DECIMAL(4,2) CHECK (body_fat_percentage BETWEEN 0 AND 100),
    measurements JSONB DEFAULT '{}',
    progress_photos TEXT[],
    energy_level INT CHECK (energy_level BETWEEN 1 AND 10),
    sleep_hours DECIMAL(3,1) CHECK (sleep_hours BETWEEN 0 AND 24),
    water_intake_liters DECIMAL(3,1) CHECK (water_intake_liters >= 0),
    blood_pressure_systolic  INTEGER CHECK (blood_pressure_systolic  IS NULL OR (blood_pressure_systolic  BETWEEN 60  AND 250)),
    blood_pressure_diastolic INTEGER CHECK (blood_pressure_diastolic IS NULL OR (blood_pressure_diastolic BETWEEN 40  AND 150)),
    blood_pressure           VARCHAR(20),
    heart_rate               INTEGER CHECK (heart_rate               IS NULL OR (heart_rate               BETWEEN 30  AND 250)),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);
CREATE INDEX idx_progress_logs_user_date ON progress_logs(user_id, log_date DESC);

CREATE TABLE weight_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_kg   DECIMAL(5,2) NOT NULL CHECK (weight_kg > 0),
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, logged_date)
);
CREATE INDEX idx_weight_logs_user_date ON weight_logs(user_id, logged_date DESC);

CREATE TABLE nutrition_plans (
    id                      SERIAL PRIMARY KEY,
    user_id                 INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calorie_target          INT NOT NULL CHECK (calorie_target > 0),
    original_calorie_target INT,
    protein_g               INT,
    carbs_g                 INT,
    fats_g                  INT,
    water_target_liters     DECIMAL(3,1) DEFAULT 2.5,
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX unique_active_nutrition_per_user ON nutrition_plans(user_id) WHERE is_active = TRUE;

CREATE TABLE nutrition_adjustments (
    id               SERIAL PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_target  INT,
    new_target       INT,
    reason           VARCHAR(100),
    adjusted_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_nutrition_adjustments_user ON nutrition_adjustments(user_id, adjusted_at DESC);

CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    earned_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
CREATE INDEX idx_achievements_user ON user_achievements(user_id, earned_at DESC);

CREATE TABLE user_streaks (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_workout_streak INT DEFAULT 0,
    longest_workout_streak INT DEFAULT 0,
    last_workout_date DATE,
    total_workouts INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    preferred_training_time TIME,
    sleep_goal_hours DECIMAL(3,1) DEFAULT 8.0,
    water_goal_liters DECIMAL(3,1) DEFAULT 2.5,
    reminder_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    target_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_meal_plans (
    id        SERIAL PRIMARY KEY,
    user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    plan_data JSONB NOT NULL,
    tdee INT, protein_g INT, carbs_g INT, fats_g INT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, plan_date)
);
CREATE INDEX idx_ai_meal_plans_user_date ON ai_meal_plans(user_id, plan_date DESC);
CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id, created_at DESC);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at              BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at           BEFORE UPDATE ON profiles           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_plans_updated_at              BEFORE UPDATE ON plans              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_meal_logs_updated_at          BEFORE UPDATE ON meal_logs          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_exercises_updated_at          BEFORE UPDATE ON exercises          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_workout_logs_updated_at       BEFORE UPDATE ON workout_logs       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_progress_logs_updated_at      BEFORE UPDATE ON progress_logs      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_exercise_prs_updated_at       BEFORE UPDATE ON exercise_prs       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_nutrition_plans_updated_at    BEFORE UPDATE ON nutrition_plans    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_streaks_updated_at       BEFORE UPDATE ON user_streaks       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_preferences_updated_at   BEFORE UPDATE ON user_preferences   FOR EACH ROW EXECUTE FUNCTION set_updated_at();