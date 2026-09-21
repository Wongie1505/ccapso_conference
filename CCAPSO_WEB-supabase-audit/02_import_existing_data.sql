-- One-time import of the existing fundraiser data.
-- Run after 01_schema.sql, and run this script only once.

insert into public.payment_methods (event_id, name, details) values
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Airtel Money', 'Line: 0995954564
Name: Mike Kaumphawi'),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'TNM Mpamba', 'Line: 0899177844
Name: Tamanda Kaumphawi'),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Bank transfer', 'Bank: National Bank
Acc name: Tamanda Kaumphawi
Acc no: 1011250048');

insert into public.attendees (event_id, name, amount_paid)
values
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Godwin Tukululu', 50000.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Montfort Geza', 50000.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Miranda Kaumphawi', 50000.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Gladys', 25000.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Richman', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Chancy Gondwe', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Eliza', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Christopher Adams', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Jack', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Jonathan', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Mercy', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Bonface', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Given', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Mirrium', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Major Nthala', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Gabriel Moyo', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Legend James', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Alfred Mwale', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Vanessa Kunyambo', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Thocco', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Happy', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Zaithwa', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Arthur Rodgers', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Emmanuel Katchenga', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Happy Kayenda', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Chisomo Chamboza', 25000.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Hope Kalumo', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Grace', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Reverend', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Sangwani', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Carol Jailosi', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Faith', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Alinafe Banda', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Roshane', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Philess Sinjeni', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Winston Makiyi', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Innocencia maonga', 70000.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Connex Jeremiah', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Linda Khalani', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Zenus Bisamu', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Ralph Nyirenda', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Emmanuel', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Shalom Amilosi', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Tendai', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Kachande', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Symon Box', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Etiness', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Charles Densan', 40000.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Martha Pwele', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Christopher Chipeta', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Rose Kondowe', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Blessings', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Ellan', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Thoko Zimkanda', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Ashely Phiri', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Ido', 0.0),
('2385ac63-99d1-4e53-9b2e-41074cd72b57', 'Flora', 0.0);

select count(*) as payment_methods_imported from public.payment_methods where event_id = '2385ac63-99d1-4e53-9b2e-41074cd72b57';
select count(*) as attendees_imported from public.attendees where event_id = '2385ac63-99d1-4e53-9b2e-41074cd72b57';
