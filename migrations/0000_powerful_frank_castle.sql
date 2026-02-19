CREATE TABLE "chatMessages" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "pollOptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"pollId" integer NOT NULL,
	"text" text NOT NULL
);

CREATE TABLE "pollVotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"pollId" integer NOT NULL,
	"optionId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "pollOptions"
	ADD CONSTRAINT "pollOptions_pollId_polls_id_fk"
	FOREIGN KEY ("pollId") REFERENCES "polls"("id")
	ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "pollVotes"
	ADD CONSTRAINT "pollVotes_pollId_polls_id_fk"
	FOREIGN KEY ("pollId") REFERENCES "polls"("id")
	ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "pollVotes"
	ADD CONSTRAINT "pollVotes_optionId_pollOptions_id_fk"
	FOREIGN KEY ("optionId") REFERENCES "pollOptions"("id")
	ON DELETE NO ACTION ON UPDATE NO ACTION;
