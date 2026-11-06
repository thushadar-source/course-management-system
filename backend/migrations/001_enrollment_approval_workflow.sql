
USE course_management;

-- Add enrollment approval fields
ALTER TABLE enrollments
ADD COLUMN status ENUM('pending', 'approved', 'rejected')
NOT NULL DEFAULT 'approved',

ADD COLUMN reviewed_by INT NULL,

ADD COLUMN reviewed_at DATETIME NULL,

ADD COLUMN decision_note TEXT NULL;

-- Remove the old unique constraint
ALTER TABLE enrollments
DROP INDEX student_id;

-- Add a normal composite index
CREATE INDEX idx_student_course_status
ON enrollments (student_id, course_id, status);

-- Add reviewer foreign key
ALTER TABLE enrollments
ADD CONSTRAINT fk_enrollment_reviewer
FOREIGN KEY (reviewed_by)
REFERENCES users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;
