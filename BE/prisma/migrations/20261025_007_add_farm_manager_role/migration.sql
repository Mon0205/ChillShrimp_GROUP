-- Commit the enum value before using it in check constraints.
ALTER TYPE "FarmRole" ADD VALUE IF NOT EXISTS 'farm_manager';
