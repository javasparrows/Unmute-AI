-- CreateTable
CREATE TABLE "PageViewDaily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT '',
    "countryCode" VARCHAR(2) NOT NULL DEFAULT '',
    "views" INTEGER NOT NULL,
    "uniqueVisitors" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageViewDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageViewDaily_date_idx" ON "PageViewDaily"("date");

-- CreateIndex
CREATE INDEX "PageViewDaily_path_date_idx" ON "PageViewDaily"("path", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PageViewDaily_date_path_locale_countryCode_key" ON "PageViewDaily"("date", "path", "locale", "countryCode");
