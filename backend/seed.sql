USE course_management;

-- =========================
-- USERS
-- =========================

INSERT INTO users
(username, password, full_name, role)
VALUES
(
    'admin',
    '$2b$10$8Q8Q8Q8Q8Q8Q8Q8Q8Q8QeQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8',
    'Administrator',
    'admin'
),
(
    'kamal',
    '$2b$10$8Q8Q8Q8Q8Q8Q8Q8Q8Q8QeQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8',
    'Kamal',
    'student'
),
(
    'nimal',
    '$2b$10$8Q8Q8Q8Q8Q8Q8Q8Q8Q8QeQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8',
    'Nimal',
    'student'
),
(
    'saman',
    '$2b$10$8Q8Q8Q8Q8Q8Q8Q8Q8Q8QeQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8',
    'Saman',
    'student'
);


-- =========================
-- COURSES
-- =========================

INSERT INTO courses
(title, category, level, duration, price, image, description, max_students)
VALUES

(
    'HTML & CSS',
    'Web Development',
    'Beginner',
    '4 Weeks',
    15000.00,
    '',
    'Learn the fundamentals of HTML and CSS and build modern web pages.',
    2
),

(
    'JavaScript',
    'Programming',
    'Intermediate',
    '6 Weeks',
    20000.00,
    '',
    'Learn JavaScript programming and modern web development concepts.',
    NULL
),

(
    'Node.js',
    'Backend',
    'Intermediate',
    '5 Weeks',
    22000.00,
    '',
    'Learn backend development using Node.js.',
    NULL
),

(
    'Express.js',
    'Backend',
    'Intermediate',
    '4 Weeks',
    18000.00,
    '',
    'Build web APIs and backend applications using Express.js.',
    NULL
),

(
    'MongoDB',
    'Database',
    'Beginner',
    '4 Weeks',
    17000.00,
    '',
    'Learn MongoDB database concepts and CRUD operations.',
    NULL
),

(
    'MySQL',
    'Database',
    'Beginner',
    '4 Weeks',
    16000.00,
    '',
    'Learn relational database concepts and MySQL.',
    NULL
),

(
    'React',
    'Frontend',
    'Advanced',
    '6 Weeks',
    25000.00,
    '',
    'Learn React and build modern frontend applications.',
    NULL
),

(
    'Full Stack Web Development',
    'Web Development',
    'Advanced',
    '12 Weeks',
    45000.00,
    '',
    'Learn frontend and backend development to build full-stack applications.',
    NULL
);


-- =========================
-- ENROLLMENTS
-- =========================

-- Kamal
INSERT INTO enrollments
(student_id, course_id)
VALUES
(
    (SELECT id FROM users WHERE username = 'kamal'),
    (SELECT id FROM courses WHERE title = 'HTML & CSS')
),
(
    (SELECT id FROM users WHERE username = 'kamal'),
    (SELECT id FROM courses WHERE title = 'JavaScript')
),
(
    (SELECT id FROM users WHERE username = 'kamal'),
    (SELECT id FROM courses WHERE title = 'MySQL')
);


-- Nimal
INSERT INTO enrollments
(student_id, course_id)
VALUES
(
    (SELECT id FROM users WHERE username = 'nimal'),
    (SELECT id FROM courses WHERE title = 'Node.js')
),
(
    (SELECT id FROM users WHERE username = 'nimal'),
    (SELECT id FROM courses WHERE title = 'Express.js')
);


-- Saman
INSERT INTO enrollments
(student_id, course_id)
VALUES
(
    (SELECT id FROM users WHERE username = 'saman'),
    (SELECT id FROM courses WHERE title = 'JavaScript')
),
(
    (SELECT id FROM users WHERE username = 'saman'),
    (SELECT id FROM courses WHERE title = 'React')
);