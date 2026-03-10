export interface ScenicSpot {
    id: string; // e.g. 'lingyin_temple'
    name: string;
    longitude?: number;
    latitude?: number;
    city_name?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Attraction {
    id: string;
    scenic_id: string;
    name: string;
    is_active?: boolean;
    longitude?: number;
    latitude?: number;
    altitude?: number;
    description?: string;
    source_url?: string;
    opening_time?: string;
    closing_time?: string;
    created_at?: string;
    updated_at?: string;
}

export interface AttractionImage {
    id: number;
    scenic_id: string;
    attraction_id: string;
    image_url: string;
    caption?: string;
    sort_order?: number;
    created_at?: string;
}

export interface TourRoute {
    id: number;
    scenic_id: string;
    name: string;
    description?: string;
    route_data: any; // JSONB
    estimated_duration?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Event {
    id: number;
    scenic_id: string;
    event_date: string; // DATE
    start_time?: string; // TIME
    end_time?: string; // TIME
    name: string;
    attraction_id?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface AdminProfile {
    id: string; // matches auth.users.id
    email: string;
    role: 'super_admin' | 'scenic_admin';
    scenic_id?: string; // only for scenic_admin
    created_at?: string;
    updated_at?: string;
}
