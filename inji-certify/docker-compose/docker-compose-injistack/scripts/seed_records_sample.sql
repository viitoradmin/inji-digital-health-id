INSERT INTO certify.records (id, first_name, last_name, dob, gender, phone_number, email)
VALUES
    ('HEALTH-001', 'Priya', 'Sharma', '1992-03-14', 'Female', '+919876543210', 'priya.sharma@example.local'),
    ('HEALTH-002', 'Arjun', 'Patel', '1988-11-02', 'Male', '+919123456789', 'arjun.patel@example.local'),
    ('HEALTH-003', 'Shailesh', 'Gojiya', '1815-12-10', 'Female', '+919876543210', 'shailesh.gojiya@viitor.cloud')
ON CONFLICT (id) DO NOTHING;
