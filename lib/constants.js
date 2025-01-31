export const NOFOLLOW_LIMIT = 100
export const BOOST_MIN = 5000
export const UPLOAD_SIZE_MAX = 2 * 1024 * 1024
export const IMAGE_PIXELS_MAX = 35000000
export const UPLOAD_TYPES_ALLOW = [
  'image/gif',
  'image/heic',
  'image/png',
  'image/jpeg',
  'image/webp'
]
export const COMMENT_DEPTH_LIMIT = 10
export const MAX_TITLE_LENGTH = 80
export const MAX_POLL_CHOICE_LENGTH = 30
export const ITEM_SPAM_INTERVAL = '10m'
export const MAX_POLL_NUM_CHOICES = 10
export const MIN_POLL_NUM_CHOICES = 2
export const ITEM_FILTER_THRESHOLD = 1.2
export const DONT_LIKE_THIS_COST = 1

// XXX this is temporary until we have so many subs they have
// to be loaded from the server
export const SUBS = ['bitcoin', 'nostr', 'tech', 'meta', 'jobs']
export const SUBS_NO_JOBS = SUBS.filter(s => s !== 'jobs')
