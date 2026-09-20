-- Daily mission definitions for Chalega India
-- Keeps the existing missions table and adds the four missions
-- currently used by the app.

INSERT INTO public.missions
    (title, description, target_steps, reward_points, active)
VALUES
    (
        'Walk 4,000 Steps',
        'Complete 4,000 steps today.',
        4000,
        40,
        true
    ),
    (
        'Drink 6 Glasses of Water',
        'Complete your daily water goal.',
        NULL,
        18,
        true
    ),
    (
        'Complete Health Check-in',
        'Complete your daily health check-in.',
        NULL,
        10,
        true
    ),
    (
        'Keep Your Streak Alive',
        'Complete your daily walking streak.',
        NULL,
        25,
        true
    );
