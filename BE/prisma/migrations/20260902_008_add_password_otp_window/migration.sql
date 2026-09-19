create table "password_reset_otp_windows" (
  "email" text not null,
  "expires_at" timestamptz(6) not null,
  "created_at" timestamptz(6) not null default current_timestamp,
  "updated_at" timestamptz(6) not null,
  constraint "password_reset_otp_windows_pkey" primary key ("email")
);
