-- =============================================================
-- Antigravity Database Schema (Auto-generated from Remote DB)
-- Generated at: Mon Mar  9 10:50:46 CST 2026
-- =============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tour_routes (
    id integer NOT NULL DEFAULT nextval('tour_routes_id_seq'::regclass),
    name text NOT NULL,
    description text,
    route_data jsonb NOT NULL,
    estimated_duration text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scenic_id text NOT NULL
);

CREATE UNIQUE INDEX tour_routes_pkey ON public.tour_routes USING btree (id);
CREATE INDEX idx_routes_scenic_id ON public.tour_routes USING btree (scenic_id);

CREATE TABLE IF NOT EXISTS attractions (
    id text NOT NULL,
    name text NOT NULL,
    longitude double precision,
    latitude double precision,
    altitude double precision,
    description text,
    source_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    opening_time text,
    closing_time text,
    scenic_id text NOT NULL,
    recall_radius integer DEFAULT 20,
    is_active boolean DEFAULT false
);

CREATE UNIQUE INDEX attractions_pkey ON public.attractions USING btree (id);
CREATE INDEX idx_attractions_scenic_id ON public.attractions USING btree (scenic_id);

CREATE TABLE IF NOT EXISTS events (
    id integer NOT NULL DEFAULT nextval('events_id_seq'::regclass),
    event_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    name text NOT NULL,
    attraction_id text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scenic_id text NOT NULL
);

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);
CREATE INDEX idx_events_date ON public.events USING btree (event_date);
CREATE INDEX idx_events_scenic_date ON public.events USING btree (scenic_id, event_date);

CREATE TABLE IF NOT EXISTS scenic_spots (
    id text NOT NULL,
    name text NOT NULL,
    longitude double precision,
    latitude double precision,
    city_name text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    enable_location_filter boolean DEFAULT false
);

CREATE UNIQUE INDEX scenic_spots_pkey ON public.scenic_spots USING btree (id);

CREATE TABLE IF NOT EXISTS admin_profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    scenic_id text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX admin_profiles_pkey ON public.admin_profiles USING btree (id);

CREATE TABLE IF NOT EXISTS attraction_images (
    id integer NOT NULL DEFAULT nextval('attraction_images_id_seq'::regclass),
    attraction_id text NOT NULL,
    image_url text NOT NULL,
    caption text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    scenic_id text NOT NULL,
    embedding_mp USER-DEFINED,
    embedding_dashscope USER-DEFINED
);

CREATE UNIQUE INDEX attraction_images_pkey ON public.attraction_images USING btree (id);
CREATE INDEX idx_images_attraction_id ON public.attraction_images USING btree (attraction_id);
CREATE INDEX idx_images_scenic_id ON public.attraction_images USING btree (scenic_id);
CREATE INDEX idx_images_embedding_mp ON public.attraction_images USING hnsw (embedding_mp vector_cosine_ops);
CREATE INDEX idx_images_embedding_dashscope ON public.attraction_images USING hnsw (embedding_dashscope vector_cosine_ops);

