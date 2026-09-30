--
-- PostgreSQL database dump
--

\restrict 36bvVXPnGWtUKHAa1uDwCpEZ2rD7dJpcYhDJjxNWVZdmQNlwBxXqGSvc4FNYyTp

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
-- Name: ControlType; Type: TYPE; Schema: public; Owner: dev_user
--

CREATE TYPE public."ControlType" AS ENUM (
    'EXAM',
    'CREDIT'
);


ALTER TYPE public."ControlType" OWNER TO dev_user;

--
-- Name: WeekType; Type: TYPE; Schema: public; Owner: dev_user
--

CREATE TYPE public."WeekType" AS ENUM (
    'ALL',
    'EVEN',
    'ODD'
);


ALTER TYPE public."WeekType" OWNER TO dev_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Assignment; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public."Assignment" (
    id text NOT NULL,
    "subjectId" text NOT NULL,
    title text NOT NULL,
    "maxScore" double precision NOT NULL,
    "dueDate" timestamp(3) without time zone
);


ALTER TABLE public."Assignment" OWNER TO dev_user;

--
-- Name: Group; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public."Group" (
    id text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Group" OWNER TO dev_user;

--
-- Name: Schedule; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public."Schedule" (
    id text NOT NULL,
    "groupId" text NOT NULL,
    "subjectId" text NOT NULL,
    "dayOfWeek" integer NOT NULL,
    "weekType" public."WeekType" NOT NULL,
    "lessonOrder" integer NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    room text NOT NULL,
    teacher text
);


ALTER TABLE public."Schedule" OWNER TO dev_user;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Session" OWNER TO dev_user;

--
-- Name: Subject; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public."Subject" (
    id text NOT NULL,
    name text NOT NULL,
    "groupId" text NOT NULL,
    "controlType" public."ControlType" DEFAULT 'EXAM'::public."ControlType" NOT NULL
);


ALTER TABLE public."Subject" OWNER TO dev_user;

--
-- Name: User; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "groupId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    password text
);


ALTER TABLE public."User" OWNER TO dev_user;

--
-- Name: UserGrade; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public."UserGrade" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "assignmentId" text NOT NULL,
    score double precision NOT NULL,
    "earnedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UserGrade" OWNER TO dev_user;

--
-- Name: UserTask; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public."UserTask" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "scheduleId" text NOT NULL,
    content text NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "dueDate" timestamp(3) without time zone
);


ALTER TABLE public."UserTask" OWNER TO dev_user;

--
-- Data for Name: Assignment; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public."Assignment" (id, "subjectId", title, "maxScore", "dueDate") FROM stdin;
cmulo5xel0005woytpi782kib	cmulo5xel0004woytgp31ff1u	Лабораторна робота №1	7	\N
cmulo5xel0006woyt1gcvvrd2	cmulo5xel0004woytgp31ff1u	Лабораторна робота №2	7	\N
cmulo5xel0007woyta7prs551	cmulo5xel0004woytgp31ff1u	Модульна контрольна	20	\N
cmulo5xeo000awoyt1trt4eoy	cmulo5xeo0009woytts00d1vs	Практична робота 1 (HTML/CSS)	10	\N
cmulo5xeo000bwoyt4by4sb10	cmulo5xeo0009woytts00d1vs	Практична робота 2 (React)	15	\N
\.


--
-- Data for Name: Group; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public."Group" (id, name, "createdAt") FROM stdin;
cmulo5xbn0000woytbahj84nb	КН-21	2026-09-28 19:57:37.14
cmuloj1yy0004wocpeofzt6c7	ІПЗ-99-9686	2026-09-28 20:07:49.69
cmuloodqi0000wolkcje9t5qd	241Б	2026-09-28 20:11:58.218
\.


--
-- Data for Name: Schedule; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public."Schedule" (id, "groupId", "subjectId", "dayOfWeek", "weekType", "lessonOrder", "startTime", "endTime", room, teacher) FROM stdin;
cmulo5xer000dwoytkdi61sro	cmulo5xbn0000woytbahj84nb	cmulo5xel0004woytgp31ff1u	1	ALL	1	08:30	10:05	ауд. 305	Коваленко О. П.
cmulo5xet000fwoytq2lihitv	cmulo5xbn0000woytbahj84nb	cmulo5xeo0009woytts00d1vs	1	ODD	2	10:20	11:55	комп. клас 12	Сидоренко В. М.
cmuloj22q000dwocpezewqcdc	cmuloj1yy0004wocpeofzt6c7	cmuloj22j000awocp4aznfn5d	1	ALL	1	08:30	10:05	ауд. 501	Петренко П. П.
cmuloj22q000ewocp27cqjrgn	cmuloj1yy0004wocpeofzt6c7	cmuloj22n000cwocpvwxixw7z	1	ODD	2	10:20	11:55	комп. клас 5	Василенко В. В.
cmuloj22q000fwocplkt11km6	cmuloj1yy0004wocpeofzt6c7	cmuloj22j000awocp4aznfn5d	2	ALL	1	08:30	10:05	ауд. 501	Петренко П. П.
cmulowpwb000bwolk7izexrao	cmuloodqi0000wolkcje9t5qd	cmulowpw30006wolkhp5ei09j	1	ALL	4	13:00	14:20	8-216	Лазорик В.В
cmulowpwc000cwolkhufr8moh	cmuloodqi0000wolkcje9t5qd	cmulowpw60008wolky0hmn1pi	1	ALL	5	14:40	16:00	8-221	Лазорик В.В
cmulowpwc000dwolkcryvga5l	cmuloodqi0000wolkcje9t5qd	cmulowpw8000awolkx95r44wk	1	ALL	6	16:10	17:30	8-221	Лазорик В.В
cmulp1gvp000ewolk2js26zyj	cmuloodqi0000wolkcje9t5qd	cmulowpw30006wolkhp5ei09j	2	ALL	1	08:30	10:05	комп. клас 10	Сидоренко В. М.
cmulp1gvp000fwolk3gl8gfsb	cmuloodqi0000wolkcje9t5qd	cmulowpw30006wolkhp5ei09j	2	EVEN	2	10:20	11:55	ауд. 305	Коваленко О. П.
cmulp1gvp000gwolk15b0u5hp	cmuloodqi0000wolkcje9t5qd	cmulowpw30006wolkhp5ei09j	3	ALL	1	08:30	10:05	ауд. 210	Коваленко О. П.
cmulp1gvp000hwolkcf39atx3	cmuloodqi0000wolkcje9t5qd	cmulowpw30006wolkhp5ei09j	3	ODD	2	10:20	11:55	комп. клас 12	Сидоренко В. М.
cmulp1gvp000iwolko3vm6hrd	cmuloodqi0000wolkcje9t5qd	cmulowpw30006wolkhp5ei09j	4	ALL	2	10:20	11:55	комп. клас 14	Сидоренко В. М.
cmulp1gvp000jwolkjkus716p	cmuloodqi0000wolkcje9t5qd	cmulowpw30006wolkhp5ei09j	5	ALL	1	08:30	10:05	ауд. 401	Коваленко О. П.
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public."Session" (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
cmuloh1e60003wo00m40dqzd7	ef59863871482b2e0d91dc5486afb0f9a0f67b8b70cb9efa8d381f9ca017645b	cmuloh1e10001wo0000btl3rj	2026-10-28 20:06:15.629	2026-09-28 20:06:15.63
cmuloj1yp0003wocpa7jolc7c	1094522353ea36545e88cb4be9cb1679ca3438493aad94945d5128ea5af43f22	cmuloj1ym0001wocp6zjtnxa2	2026-10-28 20:07:49.68	2026-09-28 20:07:49.681
cmuloj21v0008wocpen1156s6	687278f4bdd8ee5eb158537a66818b34b867e6d58ca528f84927765dcf532ee4	cmuloj21t0006wocpzb12a0au	2026-10-28 20:07:49.794	2026-09-28 20:07:49.795
cmuloj2a3000hwocpf9p8232w	afa10a1c8e0adf7c7e000012f66f83617a33ce0e073acc8ed19d7115b146ff29	cmuloj1ym0001wocp6zjtnxa2	2026-10-28 20:07:50.091	2026-09-28 20:07:50.092
cmuloj2a7000jwocp504kpiia	53af4229d0c6d483972af65aff1633e4f8a376035309f19ffb23dfef05f22891	cmulo5xei0002woytxh2jzdti	2026-10-28 20:07:50.095	2026-09-28 20:07:50.095
cmuloodto0004wolk9mh17def	45d1619a4e26001ec029b23f6d8e1d98bf569043ef0d96d1ebdcb474dfd58281	cmuloodti0002wolk4dr0ccib	2026-10-28 20:11:58.331	2026-09-28 20:11:58.333
\.


--
-- Data for Name: Subject; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public."Subject" (id, name, "groupId", "controlType") FROM stdin;
cmulo5xel0004woytgp31ff1u	Вища математика	cmulo5xbn0000woytbahj84nb	EXAM
cmulo5xeo0009woytts00d1vs	Веб-програмування	cmulo5xbn0000woytbahj84nb	EXAM
cmuloj22j000awocp4aznfn5d	Веб-технології	cmuloj1yy0004wocpeofzt6c7	EXAM
cmuloj22n000cwocpvwxixw7z	Компʼютерна графіка	cmuloj1yy0004wocpeofzt6c7	EXAM
cmulowpw30006wolkhp5ei09j	Веб програмування	cmuloodqi0000wolkcje9t5qd	EXAM
cmulowpw60008wolky0hmn1pi	Веб програмування(Лекція)	cmuloodqi0000wolkcje9t5qd	EXAM
cmulowpw8000awolkx95r44wk	Програмування мовою Java(Лекція)	cmuloodqi0000wolkcje9t5qd	EXAM
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public."User" (id, email, name, "groupId", "createdAt", password) FROM stdin;
cmulo5xei0002woytxh2jzdti	student@sharaga.ua	Студент	cmulo5xbn0000woytbahj84nb	2026-09-28 19:57:37.243	$2b$10$9D63nR0PTLVnxm1pQ3kWYOBaneq.IPV0uj4rQs8V6Miezl26v9E0q
cmuloh1e10001wo0000btl3rj	student_test_1790625975475@test.com	Іван Тестовий	cmulo5xbn0000woytbahj84nb	2026-09-28 20:06:15.625	$2b$10$5vZXOtiPiBqc8XHKmNHDwufHoE8.TEzj8j6MLxGPHNwUzS/wGHsC2
cmuloj1ym0001wocp6zjtnxa2	student_test_1790626069551@test.com	Іван Тестовий	cmulo5xbn0000woytbahj84nb	2026-09-28 20:07:49.678	$2b$10$8OzRPtWduomjzbPg84Kb9OHL.nHJxlsPi/aKJ43K8HDHMw7MTI/aK
cmuloj21t0006wocpzb12a0au	creator_1790626069686@test.com	Староста Групи	cmuloj1yy0004wocpeofzt6c7	2026-09-28 20:07:49.793	$2b$10$cN9h73ZZJjjSjo94vCz3HuIniZ7HYgTDkPybY9zQnLrNHKCJTG6Aq
cmuloodti0002wolk4dr0ccib	bodnar.andrii@chnu.edu.ua	Боднар Андрій	cmuloodqi0000wolkcje9t5qd	2026-09-28 20:11:58.327	$2b$10$GZknanRHCHaI./XBpJRU8O7r51ZursOLPyiWFMUhECqXZKu.nhMo6
\.


--
-- Data for Name: UserGrade; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public."UserGrade" (id, "userId", "assignmentId", score, "earnedAt") FROM stdin;
cmulo5xey000jwoytwguox1oj	cmulo5xei0002woytxh2jzdti	cmulo5xel0005woytpi782kib	5	2026-09-28 19:57:37.258
\.


--
-- Data for Name: UserTask; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public."UserTask" (id, "userId", "scheduleId", content, "isCompleted", "dueDate") FROM stdin;
cmulo5xev000hwoytatjnlvtp	cmulo5xei0002woytxh2jzdti	cmulo5xer000dwoytkdi61sro	Розвʼязати інтеграли №4, 7 зі стор. 42	f	2026-09-28 09:00:00
\.


--
-- Name: Assignment Assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."Assignment"
    ADD CONSTRAINT "Assignment_pkey" PRIMARY KEY (id);


--
-- Name: Group Group_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."Group"
    ADD CONSTRAINT "Group_pkey" PRIMARY KEY (id);


--
-- Name: Schedule Schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."Schedule"
    ADD CONSTRAINT "Schedule_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: Subject Subject_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_pkey" PRIMARY KEY (id);


--
-- Name: UserGrade UserGrade_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."UserGrade"
    ADD CONSTRAINT "UserGrade_pkey" PRIMARY KEY (id);


--
-- Name: UserTask UserTask_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."UserTask"
    ADD CONSTRAINT "UserTask_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Group_name_key; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX "Group_name_key" ON public."Group" USING btree (name);


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: UserGrade_userId_assignmentId_key; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX "UserGrade_userId_assignmentId_key" ON public."UserGrade" USING btree ("userId", "assignmentId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Assignment Assignment_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."Assignment"
    ADD CONSTRAINT "Assignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Schedule Schedule_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."Schedule"
    ADD CONSTRAINT "Schedule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Schedule Schedule_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."Schedule"
    ADD CONSTRAINT "Schedule_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Subject Subject_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."Subject"
    ADD CONSTRAINT "Subject_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserGrade UserGrade_assignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."UserGrade"
    ADD CONSTRAINT "UserGrade_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES public."Assignment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserGrade UserGrade_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."UserGrade"
    ADD CONSTRAINT "UserGrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserTask UserTask_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."UserTask"
    ADD CONSTRAINT "UserTask_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES public."Schedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserTask UserTask_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."UserTask"
    ADD CONSTRAINT "UserTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public."Group"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 36bvVXPnGWtUKHAa1uDwCpEZ2rD7dJpcYhDJjxNWVZdmQNlwBxXqGSvc4FNYyTp

