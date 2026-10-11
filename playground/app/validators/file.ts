import vine from '@vinejs/vine'

export const uploadValidator = vine.create({
  title: vine.string(),
  file: vine.file({ size: '10mb', extnames: ['png', 'jpg'] }),
  thumbnail: vine.file().optional(),
  attachments: vine.array(vine.file()).optional(),
})
