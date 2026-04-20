export type Sign = {
  id: string
  uploader_id: string | null
  image_url: string
  caption: string | null
  location_name: string | null
  like_count: number
  super_like_count: number
  comment_count: number
  created_at: string
}

export type Comment = {
  id: string
  user_id: string
  sign_id: string
  content: string
  created_at: string
  users?: { nickname: string | null; avatar_url: string | null }
}

export type ActionType = 'like' | 'dislike' | 'super_like'
