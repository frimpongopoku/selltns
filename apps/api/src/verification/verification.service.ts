import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImageProcessingService } from '../media/image-processing.service';
import {
  PRIVATE_STORAGE_SERVICE,
  type PrivateStorageService,
} from '../media/storage/private-storage.service';
import { ALLOWED_MIME_TYPES } from '../media/media.constants';

const GHANA_CARD_PATTERN = /^GHA-\d{9}-\d$/;

export interface VerificationStatusResult {
  status: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  legalName?: string;
  ghanaCardNumber?: string;
  rejectionReason?: string | null;
  submittedAt?: Date;
  reviewedAt?: Date | null;
}

export interface SubmitVerificationInput {
  legalName?: string;
  ghanaCardNumber?: string;
  idPhoto: Express.Multer.File | undefined;
  selfiePhoto: Express.Multer.File | undefined;
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imaging: ImageProcessingService,
    @Inject(PRIVATE_STORAGE_SERVICE)
    private readonly privateStorage: PrivateStorageService,
  ) {}

  async getStatus(tenantId: string): Promise<VerificationStatusResult> {
    const [tenant, request] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { verificationStatus: true },
      }),
      this.prisma.verificationRequest.findUnique({ where: { tenantId } }),
    ]);

    if (!request) {
      return { status: tenant.verificationStatus };
    }

    return {
      status: tenant.verificationStatus,
      legalName: request.legalName,
      ghanaCardNumber: request.ghanaCardNumber,
      rejectionReason: request.rejectionReason,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
    };
  }

  async submit(
    tenantId: string,
    input: SubmitVerificationInput,
  ): Promise<VerificationStatusResult> {
    const legalName = input.legalName?.trim();
    if (!legalName) {
      throw new BadRequestException('Your full legal name is required.');
    }

    const ghanaCardNumber = input.ghanaCardNumber?.trim().toUpperCase();
    if (!ghanaCardNumber || !GHANA_CARD_PATTERN.test(ghanaCardNumber)) {
      throw new BadRequestException(
        'Enter a valid Ghana Card number, in the form GHA-000000000-0.',
      );
    }

    if (!input.idPhoto) {
      throw new BadRequestException('A photo of your Ghana Card is required.');
    }
    this.assertImage(input.idPhoto);
    if (input.selfiePhoto) this.assertImage(input.selfiePhoto);

    const existing = await this.prisma.verificationRequest.findUnique({
      where: { tenantId },
    });
    if (existing?.status === 'PENDING') {
      throw new ConflictException(
        'Your application is already under review.',
      );
    }

    const idPhoto = await this.imaging
      .process(input.idPhoto.buffer)
      .catch(() => {
        throw new BadRequestException(
          "Couldn't read that ID photo — is it a valid image?",
        );
      });
    const idPhotoKey = `verification/${tenantId}/id-photo.webp`;
    await this.privateStorage.putObject(
      idPhotoKey,
      idPhoto.display.buffer,
      'image/webp',
    );

    let selfiePhotoKey: string | null = null;
    if (input.selfiePhoto) {
      const selfie = await this.imaging
        .process(input.selfiePhoto.buffer)
        .catch(() => {
          throw new BadRequestException(
            "Couldn't read that selfie — is it a valid image?",
          );
        });
      selfiePhotoKey = `verification/${tenantId}/selfie.webp`;
      await this.privateStorage.putObject(
        selfiePhotoKey,
        selfie.display.buffer,
        'image/webp',
      );
    }

    await this.prisma.$transaction([
      this.prisma.verificationRequest.upsert({
        where: { tenantId },
        create: {
          tenantId,
          legalName,
          ghanaCardNumber,
          idPhotoKey,
          selfiePhotoKey,
          status: 'PENDING',
        },
        update: {
          legalName,
          ghanaCardNumber,
          idPhotoKey,
          selfiePhotoKey,
          status: 'PENDING',
          rejectionReason: null,
          reviewedBySuperAdminId: null,
          reviewedAt: null,
          submittedAt: new Date(),
        },
      }),
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { verificationStatus: 'PENDING' },
      }),
    ]);

    return this.getStatus(tenantId);
  }

  private assertImage(file: Express.Multer.File) {
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        'Unsupported file type — upload a JPEG, PNG, WebP or GIF image.',
      );
    }
  }
}
