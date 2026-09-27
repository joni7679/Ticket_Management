import { Schema, model, type InferSchemaType } from 'mongoose';

const replyAttachmentSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 }
  },
  { _id: false }
);

const ticketReplySchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '' },
    isInternal: { type: Boolean, default: false },
    attachments: [replyAttachmentSchema]
  },
  { timestamps: true }
);

// Hot path: getTicket loads all replies for one ticket on every poll.
ticketReplySchema.index({ ticketId: 1, createdAt: 1 });
ticketReplySchema.index({ authorId: 1, createdAt: -1 });

export type ITicketReply = InferSchemaType<typeof ticketReplySchema>;
export const TicketReply = model('TicketReply', ticketReplySchema);
