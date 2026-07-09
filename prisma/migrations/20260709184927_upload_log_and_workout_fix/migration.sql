-- CreateTable
CREATE TABLE "upload_logs" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extracted_summary" TEXT,

    CONSTRAINT "upload_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_images" (
    "id" TEXT NOT NULL,
    "upload_log_id" TEXT NOT NULL,
    "file_name" TEXT,
    "media_type" TEXT NOT NULL,
    "base64_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "upload_logs" ADD CONSTRAINT "upload_logs_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_images" ADD CONSTRAINT "uploaded_images_upload_log_id_fkey" FOREIGN KEY ("upload_log_id") REFERENCES "upload_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
