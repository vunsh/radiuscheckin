import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

class R2Client {
  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
    this.bucketName = 'mathcheckin-pdfs'
  }

  async uploadFile(fileBuffer, fileId, contentType = 'application/pdf') {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          uploadedAt: new Date().toISOString()
        }
      })

      await this.client.send(command)
      return { success: true, fileId }
    } catch (error) {
      console.error('R2 upload error:', error)
      throw error
    }
  }

  async presignPut(fileId, contentType = 'application/pdf', expiresInSeconds = 900) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
        ContentType: contentType,
        Metadata: {
          uploadedAt: new Date().toISOString()
        }
      })
      const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds })
      return { url, fileId }
    } catch (error) {
      console.error('R2 presign error:', error)
      throw error
    }
  }

  async deleteFile(fileId) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
      })

      await this.client.send(command)
      return { success: true }
    } catch (error) {
      console.error('R2 delete error:', error)
      throw error
    }
  }

  async clearBucket() {
    try {
      // List all objects
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
      })

      const listResponse = await this.client.send(listCommand)
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return { success: true, deleted: 0 }
      }

      // Delete all objects
      const deletePromises = listResponse.Contents.map(object => 
        this.deleteFile(object.Key)
      )

      await Promise.all(deletePromises)
      
      return { success: true, deleted: listResponse.Contents.length }
    } catch (error) {
      console.error('R2 clear bucket error:', error)
      throw error
    }
  }

  async listFiles() {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
      })

      const response = await this.client.send(command)
      return response.Contents || []
    } catch (error) {
      console.error('R2 list files error:', error)
      throw error
    }
  }
}

export const r2Client = new R2Client()
