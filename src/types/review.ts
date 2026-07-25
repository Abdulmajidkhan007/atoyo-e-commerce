export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  /** 1-5 yulduz */
  rating: number;
  comment: string;
  createdAt: number;
}
