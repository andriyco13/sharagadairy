--
-- PostgreSQL database dump
--

\restrict i3TxEoZ8eQthaQtNibxRqzg8mqpjuri3Fof6MXKpEK4F9DmpHjKs5Fja8FdWYH1

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Group; Type: TABLE DATA; Schema: public; Owner: dev_user
--

INSERT INTO public."Group" VALUES ('cmunsb9kk0000ijpn9kjspkxf', 'КН-21', '2026-09-30 07:29:17.109');
INSERT INTO public."Group" VALUES ('cmunslj9g0000ij6jrro8acmy', '241Б', '2026-09-30 07:37:16.228');


--
-- Data for Name: Subject; Type: TABLE DATA; Schema: public; Owner: dev_user
--

INSERT INTO public."Subject" VALUES ('cmunsb9og0004ijpna1hyehsy', 'Вища математика', 'cmunsb9kk0000ijpn9kjspkxf', 'EXAM', 'Коваленко О. П.', 'Бондаренко А. С.');
INSERT INTO public."Subject" VALUES ('cmunsb9om0009ijpn1ibgeyfq', 'Веб-програмування', 'cmunsb9kk0000ijpn9kjspkxf', 'CREDIT', 'Сидоренко В. М.', 'Сидоренко В. М.');
INSERT INTO public."Subject" VALUES ('cmunsp0ea0006ij6jb738t4hb', 'Веб програмування', 'cmunslj9g0000ij6jrro8acmy', 'CREDIT', 'доц. Лазорик В.В', 'доц. Лазорик В.В');
INSERT INTO public."Subject" VALUES ('cmunstnkf000cij6jkmrg2c95', 'Програмування мовою Java', 'cmunslj9g0000ij6jrro8acmy', 'CREDIT', 'доц. Лазорик В.В', 'асист. Кириченко О.О');
INSERT INTO public."Subject" VALUES ('cmunsz3c9000gij6jsv1he0ra', 'Ймовірнісні моделі та алгоритми', 'cmunslj9g0000ij6jrro8acmy', 'EXAM', 'доц. Кириченко О.Л', 'доц. Антонюк С.В');
INSERT INTO public."Subject" VALUES ('cmunt6io1000mij6jtvm2emht', 'Теорія прийняття рішень', 'cmunslj9g0000ij6jrro8acmy', 'EXAM', 'доц. Руснак М.А', 'доц. Руснак М.А');
INSERT INTO public."Subject" VALUES ('cmunt8xda000qij6jrf86tpp5', 'Програмування мовою Python', 'cmunslj9g0000ij6jrro8acmy', 'CREDIT', 'асист. Кириченко Є.О', 'асист. Кириченко Є.О');
INSERT INTO public."Subject" VALUES ('cmuntddd9000yij6j09r62qtq', 'Англійська мова', 'cmunslj9g0000ij6jrro8acmy', 'EXAM', 'доц. Маковійчук Л.В', 'доц. Маковійчук Л.В');
INSERT INTO public."Subject" VALUES ('cmuntgh5d0012ij6j6g2sug19', 'Організація баз данних та знань', 'cmunslj9g0000ij6jrro8acmy', 'EXAM', 'асист. Кириченко О.О', 'асист. Кириченко О.О');


--
-- Data for Name: Assignment; Type: TABLE DATA; Schema: public; Owner: dev_user
--

INSERT INTO public."Assignment" VALUES ('cmunsb9og0005ijpnaqee5jrq', 'cmunsb9og0004ijpna1hyehsy', 'Лабораторна робота №1', 7, NULL);
INSERT INTO public."Assignment" VALUES ('cmunsb9og0006ijpn80j3aubi', 'cmunsb9og0004ijpna1hyehsy', 'Лабораторна робота №2', 7, NULL);
INSERT INTO public."Assignment" VALUES ('cmunsb9og0007ijpnpablsdua', 'cmunsb9og0004ijpna1hyehsy', 'Модульна контрольна', 20, NULL);
INSERT INTO public."Assignment" VALUES ('cmunsb9om000aijpn9gkv5x7u', 'cmunsb9om0009ijpn1ibgeyfq', 'Практична робота 1 (HTML/CSS)', 10, NULL);
INSERT INTO public."Assignment" VALUES ('cmunsb9om000bijpnvj2nr784', 'cmunsb9om0009ijpn1ibgeyfq', 'Практична робота 2 (React)', 15, NULL);
INSERT INTO public."Assignment" VALUES ('cmuntmwja001aij6jos7dj3v3', 'cmunsp0ea0006ij6jb738t4hb', 'Лабораторна робота №1', 10, NULL);
INSERT INTO public."Assignment" VALUES ('cmuntocw8001eij6jvmbvuhsp', 'cmunt8xda000qij6jrf86tpp5', 'Лабораторна робота №1', 10, NULL);
INSERT INTO public."Assignment" VALUES ('cmuntow4f001iij6j7y50j7m3', 'cmunt8xda000qij6jrf86tpp5', 'Лабораторна робота №2', 10, NULL);


--
-- Data for Name: Schedule; Type: TABLE DATA; Schema: public; Owner: dev_user
--

INSERT INTO public."Schedule" VALUES ('cmunsb9or000dijpnfuzccfmj', 'cmunsb9kk0000ijpn9kjspkxf', 'cmunsb9og0004ijpna1hyehsy', 1, 'ALL', 1, 'LECTURE', '08:20', '09:40', 'ауд. 305', 'Коваленко О. П.');
INSERT INTO public."Schedule" VALUES ('cmunsb9ov000fijpnhoaae68p', 'cmunsb9kk0000ijpn9kjspkxf', 'cmunsb9om0009ijpn1ibgeyfq', 1, 'ODD', 2, 'PRACTICE', '09:50', '11:10', 'комп. клас 12', 'Сидоренко В. М.');
INSERT INTO public."Schedule" VALUES ('cmunsq5yv0008ij6jvado84zb', 'cmunslj9g0000ij6jrro8acmy', 'cmunsp0ea0006ij6jb738t4hb', 1, 'ALL', 4, 'PRACTICE', '13:00', '14:20', '8-216', 'доц. Лазорик В.В');
INSERT INTO public."Schedule" VALUES ('cmunsrkm0000aij6jic3ek1xl', 'cmunslj9g0000ij6jrro8acmy', 'cmunsp0ea0006ij6jb738t4hb', 1, 'ALL', 5, 'LECTURE', '14:40', '16:00', '8-221', 'доц. Лазорик В.В');
INSERT INTO public."Schedule" VALUES ('cmunsubc9000eij6j9ilsd998', 'cmunslj9g0000ij6jrro8acmy', 'cmunstnkf000cij6jkmrg2c95', 1, 'ALL', 6, 'LECTURE', '16:10', '17:30', '8-221', 'доц. Лазорик В.В');
INSERT INTO public."Schedule" VALUES ('cmunt3dmy000iij6jxvdnjv0q', 'cmunslj9g0000ij6jrro8acmy', 'cmunsz3c9000gij6jsv1he0ra', 2, 'ALL', 1, 'PRACTICE', '08:20', '09:40', '8-224', 'доц. Кириченко О.Л');
INSERT INTO public."Schedule" VALUES ('cmunt463t000kij6jp5fo1ga0', 'cmunslj9g0000ij6jrro8acmy', 'cmunsz3c9000gij6jsv1he0ra', 2, 'ALL', 1, 'LECTURE', '08:20', '09:40', '8-221', 'доц. Антонюк С.В');
INSERT INTO public."Schedule" VALUES ('cmunt702m000oij6j7p6l4fmg', 'cmunslj9g0000ij6jrro8acmy', 'cmunt6io1000mij6jtvm2emht', 2, 'ALL', 3, 'PRACTICE', '11:30', '12:50', '8-212', 'доц. Руснак М.А');
INSERT INTO public."Schedule" VALUES ('cmunt9k4c000sij6js3s9kjqr', 'cmunslj9g0000ij6jrro8acmy', 'cmunt8xda000qij6jrf86tpp5', 3, 'ALL', 1, 'PRACTICE', '08:20', '09:40', '8-216', 'асист. Кириченко Є.О');
INSERT INTO public."Schedule" VALUES ('cmunta5f0000uij6jfrthwo35', 'cmunslj9g0000ij6jrro8acmy', 'cmunstnkf000cij6jkmrg2c95', 3, 'ALL', 2, 'PRACTICE', '09:50', '11:10', '8-216', 'асист. Кириченко О.О');
INSERT INTO public."Schedule" VALUES ('cmuntavoc000wij6jzi46e8j1', 'cmunslj9g0000ij6jrro8acmy', 'cmunt8xda000qij6jrf86tpp5', 3, 'ALL', 3, 'LECTURE', '11:30', '12:50', '8-221', 'асист. Кириченко Є.О');
INSERT INTO public."Schedule" VALUES ('cmuntedv90010ij6jkkwv3ght', 'cmunslj9g0000ij6jrro8acmy', 'cmuntddd9000yij6j09r62qtq', 3, 'ALL', 4, 'PRACTICE', '13:00', '14:20', '8-325', 'доц. Маковійчук Л.В');
INSERT INTO public."Schedule" VALUES ('cmuntkcc40014ij6jnv53ttjn', 'cmunslj9g0000ij6jrro8acmy', 'cmuntgh5d0012ij6j6g2sug19', 4, 'ALL', 1, 'PRACTICE', '08:20', '09:40', '8-216', 'асист. Кириченко О.О');
INSERT INTO public."Schedule" VALUES ('cmuntkske0016ij6j35n8l17w', 'cmunslj9g0000ij6jrro8acmy', 'cmuntgh5d0012ij6j6g2sug19', 4, 'ALL', 2, 'LECTURE', '09:50', '11:10', '8-221', 'асист. Кириченко О.О');
INSERT INTO public."Schedule" VALUES ('cmuntlecd0018ij6ja13379su', 'cmunslj9g0000ij6jrro8acmy', 'cmunt6io1000mij6jtvm2emht', 4, 'ALL', 3, 'LECTURE', '11:30', '12:50', '8-116', 'доц. Руснак М.А');


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: dev_user
--

INSERT INTO public."User" VALUES ('cmunsb9ob0002ijpns1ljk8pz', 'student@sharaga.ua', 'Студент', '$2b$10$Mk1LhzpZwA6BqjlkqUB6Yu9rfAHGCVu9s6Lr2lwr0YSCG5ViNrYjm', 'cmunsb9kk0000ijpn9kjspkxf', '2026-09-30 07:29:17.244');
INSERT INTO public."User" VALUES ('cmunsljen0002ij6jtlrpb2ux', 'bodnar.andrii@chnu.edu.ua', 'Андрій Боднар', '$2b$10$GzgRmmjArjrppuAWXFQSw.W3dbNIDI0gr7L0x8G1g96rpeU5nPB/K', 'cmunslj9g0000ij6jrro8acmy', '2026-09-30 07:37:16.415');


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: dev_user
--

INSERT INTO public."Session" VALUES ('cmunv7lx50001ij7ot2ux8nmz', 'cb47523bab6957335edba0f477f46ec85186dc9d3ea360f96a485021b289a64d', 'cmunsljen0002ij6jtlrpb2ux', '2026-10-30 08:50:25.336', '2026-09-30 08:50:25.338');
INSERT INTO public."Session" VALUES ('cmunvfgcs0001ijxho96znsrt', 'baab33af24165f96772e8d3694c595c5d2466ce4c9935040001d021fd541c8f7', 'cmunsljen0002ij6jtlrpb2ux', '2026-10-30 08:56:31.371', '2026-09-30 08:56:31.372');


--
-- Data for Name: UserGrade; Type: TABLE DATA; Schema: public; Owner: dev_user
--

INSERT INTO public."UserGrade" VALUES ('cmunsb9p4000jijpnepc5njoe', 'cmunsb9ob0002ijpns1ljk8pz', 'cmunsb9og0005ijpnaqee5jrq', 5, '2026-09-30 07:29:17.272');
INSERT INTO public."UserGrade" VALUES ('cmuntmwja001cij6jexqlcxjb', 'cmunsljen0002ij6jtlrpb2ux', 'cmuntmwja001aij6jos7dj3v3', 10, '2026-09-30 08:06:19.701');
INSERT INTO public."UserGrade" VALUES ('cmuntocw8001gij6jnqb26hui', 'cmunsljen0002ij6jtlrpb2ux', 'cmuntocw8001eij6jvmbvuhsp', 10, '2026-09-30 08:07:27.559');
INSERT INTO public."UserGrade" VALUES ('cmuntow4f001kij6jlb3rd88d', 'cmunsljen0002ij6jtlrpb2ux', 'cmuntow4f001iij6j7y50j7m3', 9.5, '2026-09-30 08:07:52.477');


--
-- Data for Name: UserTask; Type: TABLE DATA; Schema: public; Owner: dev_user
--

INSERT INTO public."UserTask" VALUES ('cmunsb9oz000hijpnlvhurf4l', 'cmunsb9ob0002ijpns1ljk8pz', 'cmunsb9or000dijpnfuzccfmj', 'Розвʼязати інтеграли №4, 7 зі стор. 42', false, '2026-09-28 09:00:00');


--
-- PostgreSQL database dump complete
--

\unrestrict i3TxEoZ8eQthaQtNibxRqzg8mqpjuri3Fof6MXKpEK4F9DmpHjKs5Fja8FdWYH1

