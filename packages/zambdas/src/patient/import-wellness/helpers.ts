import Oystehr from '@oystehr/sdk';
import crypto from 'crypto';
import { DocumentReference } from 'fhir/r4b';
import { LogRecord, ResultData, Role, WellnessRecord } from './types';

export const appendToCSV = async (
  wellnessRecord: WellnessRecord & ResultData,
  token: string,
  projectId: string,
  projectApi: string
): Promise<boolean> => {
  const globalId = wellnessRecord.order_id;
  const bucketName = `${projectId}-wellness-imports`;
  //console.log('updateResourceFields using bucket:', bucketName);
  const objectKey = 'wellness-imports.csv';

  // Define headers
  const headers = [
    'global_id',
    'import_timestamp',
    'email',
    'phone',
    'first_name',
    'last_name',
    'zip',
    'dob',
    'action',
    'user',
    'patient',
    'relatedPerson',
    'person',
    'appointment',
    'encounter',
    'documentReference',
    'inviteCodeGenerated',
    'practitioner',
    'location',
    'application',
  ].join(',');

  // Get current timestamp in ISO format
  const timestamp = new Date().toISOString();

  // Create new row with specified data
  const newRowData = [
    globalId,
    timestamp,
    wellnessRecord.email || '',
    wellnessRecord.phone || '',
    wellnessRecord.first_name || '',
    wellnessRecord.last_name || '',
    wellnessRecord.zip || '',
    wellnessRecord.dob || '',
    wellnessRecord.action || '', // action
    wellnessRecord.user || '', // user
    wellnessRecord.patient || '', // patient
    wellnessRecord.relatedPerson || '', // relatedPerson
    wellnessRecord.person || '', // person
    wellnessRecord.appointment || '', // appointment
    wellnessRecord.encounter || '', // encounter
    wellnessRecord.documentReference || '', // documentReference
    wellnessRecord.inviteCodeGenerated || '',
    wellnessRecord.practitioner || '', // practitioner
    wellnessRecord.location || '', // location
    wellnessRecord.application || '', // application
  ]
    .map((field) => `${field}`)
    .join(',');

  // First get a download URL
  const downloadUrlEndpoint = `${projectApi}/z3/${bucketName}/${objectKey}`;
  let finalContent = '';

  try {
    const downloadUrlResponse = await fetch(downloadUrlEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-zapehr-project-id': projectId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'download',
      }),
    });
    // console.log('---downloadUrlResponse.ok', downloadUrlResponse.ok);

    if (downloadUrlResponse.ok) {
      const { signedUrl } = await downloadUrlResponse.json();

      // Get the file content using the signed URL
      const getResponse = await fetch(signedUrl);
      if (getResponse.ok) {
        const content = await getResponse.text();
        //console.log('Retrieved content:', content);

        // Split content into lines and filter out empty lines and metadata
        const lines = content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line !== '' && line !== undefined && !line.startsWith('[{'));

        // console.log('Processed lines:', lines);

        if (lines.length === 0) {
          // Empty file or only contained metadata
          finalContent = `${headers}\n${newRowData}`;
        } else if (!lines[0].includes('global_id')) {
          // No headers present, add them
          finalContent = `${headers}\n${lines.join('\n')}\n${newRowData}`;
        } else {
          // Headers present, just append new row
          finalContent = `${lines.join('\n')}\n${newRowData}`;
          console.log('newRowData', newRowData);
        }
      } else {
        // New file
        finalContent = `${headers}\n${newRowData}`;
      }
    } else {
      // New file
      finalContent = `${headers}\n${newRowData}`;
    }

    // console.log('---Final content to upload:', finalContent);
  } catch (error) {
    console.log('No existing CSV found, creating new one:', error instanceof Error ? error.message : error);
    finalContent = `${headers}\n${newRowData}`;
  }

  console.log('bucketName', bucketName);
  console.log('objectKey', objectKey);

  // Get upload URL
  const uploadUrlEndpoint = `${projectApi}/z3/${bucketName}/${objectKey}`;
  try {
    const uploadUrlResponse = await fetch(uploadUrlEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-zapehr-project-id': projectId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'upload',
      }),
    });
    // console.log('----uploadUrlResponse', uploadUrlResponse.ok);

    if (!uploadUrlResponse.ok) {
      const errorText = await uploadUrlResponse.text();
      throw new Error(`Failed to get upload URL while appendToCSV: ${errorText}`);
    }

    const { signedUrl } = await uploadUrlResponse.json();
    // console.log('---signedUrl', signedUrl);
    // Upload the file
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: finalContent,
      headers: {
        'Content-Type': 'text/csv',
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
    }

    // console.log('Successfully uploaded CSV file with content:', finalContent);
    return true;
  } catch (error) {
    console.error('Error during upload:', error);
    throw new Error(`Failed to upload CSV file: ${error instanceof Error ? error.message : error}`);
  }
};

export const updateLastLineInCSV = async (
  updates: Partial<LogRecord>,
  token: string,
  projectId: string,
  projectApi: string
): Promise<boolean> => {
  const bucketName = `${projectId}-wellness-imports`;
  //console.log('updateResourceFields using bucket:', bucketName);
  const objectKey = 'wellness-imports.csv';

  // First get a download URL
  const downloadUrlEndpoint = `${projectApi}/z3/${bucketName}/${objectKey}`;

  try {
    const downloadUrlResponse = await fetch(downloadUrlEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-zapehr-project-id': projectId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'download',
      }),
    });

    if (!downloadUrlResponse.ok) {
      throw new Error('Failed to get download URL');
    }

    const { signedUrl } = await downloadUrlResponse.json();

    // Get the file content
    const getResponse = await fetch(signedUrl);
    if (!getResponse.ok) {
      throw new Error('Failed to download CSV');
    }

    const content = await getResponse.text();

    // Parse CSV content
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      // Need at least headers and one data row
      throw new Error('Invalid CSV format');
    }

    // Get headers and last line
    const headers = lines[0].split(',');
    const lastLine = lines[lines.length - 1].split(',');

    // Update the values in the last line
    headers.forEach((header, index) => {
      const key = header.trim() as keyof LogRecord;
      if (updates[key]) {
        lastLine[index] = updates[key] as string;
      }
    });
    // console.log("----lastLine", lastLine);

    // Reconstruct the CSV with updated last line
    lines[lines.length - 1] = lastLine.join(',');
    const updatedContent = lines.join('\n');

    // Get upload URL
    const uploadUrlEndpoint = `${projectApi}/z3/${bucketName}/${objectKey}`;
    const uploadUrlResponse = await fetch(uploadUrlEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-zapehr-project-id': projectId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'upload',
      }),
    });

    if (!uploadUrlResponse.ok) {
      throw new Error('Failed to get upload URL while updateResourceFields');
    }

    const { signedUrl: uploadUrl } = await uploadUrlResponse.json();

    // Upload updated content
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: updatedContent,
      headers: {
        'Content-Type': 'text/csv',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload updated CSV');
    }

    return true;
  } catch (error) {
    console.error('Error updating resource fields:', error);
    throw error;
  }
};

export const isEmailValid = (data?: string): boolean => {
  return !!data && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data);
};

export const isPhoneValid = (data?: string): boolean => {
  return !!data && data.replace(/\D/g, '').length > 0;
};

export const isLocationValid = (data?: string): boolean => {
  return !!data;
};

export const isPractitionerValid = (data?: string): boolean => {
  return !!data;
};

export const lookupRole = async (
  roleName: string,
  token: string,
  projectId: string,
  projectApi: string
): Promise<Role> => {
  const url = `${projectApi}/iam/role`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'x-zapehr-project-id': projectId,
    },
  };

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to lookup role: ${error.message}`);
  }

  const roles: Role[] = await response.json();
  const role = roles.find((r) => r.name === roleName);

  if (!role) {
    throw new Error(`Role "${roleName}" not found`);
  }

  return role;
};

export const isPdfFilesMatch = async (
  wellnessRecord: WellnessRecord,
  documentReference?: DocumentReference | null,
  z3Client?: Oystehr['z3']
): Promise<boolean> => {
  try {
    console.log('=== isPdfFilesMatch START ===');
    console.log('---documentReference exists:', !!documentReference);
    console.log('---wellnessRecord.pdfContent exists:', !!wellnessRecord.pdfContent);
    console.log('---z3Client exists:', !!z3Client);

    if (!documentReference || !wellnessRecord.pdfContent || !z3Client) {
      console.log('---Early return: missing required params');
      return false;
    }

    const existingPdfDoc = documentReference?.content?.[0]?.attachment;
    const existingPdfContent = existingPdfDoc?.data;
    const existingPdfUrl = existingPdfDoc?.url;

    if (existingPdfContent) {
      // Handle embedded PDF content
      const existingHash = crypto
        .createHash('sha256')
        .update(existingPdfContent || '')
        .digest('hex');
      const newHash = crypto
        .createHash('sha256')
        .update(wellnessRecord.pdfContent || '')
        .digest('hex');
      const pdfMatch = existingHash === newHash;
      console.log('PDF comparison (embedded content) - Exact match:', pdfMatch);

      return pdfMatch;
    } else if (existingPdfUrl && existingPdfUrl.startsWith('z3://')) {
      // Handle Z3-stored PDF
      console.log('---Processing Z3-stored PDF comparison');
      console.log('---existingPdfUrl:', existingPdfUrl);
      const bucketAndKey = existingPdfUrl.replace('z3://', '').split('/');
      const bucket = bucketAndKey[0];
      const key = bucketAndKey.slice(1).join('/');
      console.log('---bucket:', bucket, 'key:', key);

      // Get the PDF content as an array buffer and convert to base64
      console.log('---Attempting to download file from Z3...');
      try {
        const existingPdfBuffer = await z3Client.downloadFile({ bucketName: bucket, 'objectPath+': key });
        console.log('---Z3 download successful, buffer size:', existingPdfBuffer.byteLength);
        const existingPdfBase64 = Buffer.from(existingPdfBuffer).toString('base64');

        // Compare the hashes
        const existingHash = crypto.createHash('sha256').update(existingPdfBase64).digest('hex');
        const newHash = crypto.createHash('sha256').update(wellnessRecord.pdfContent).digest('hex');
        const pdfMatch = existingHash === newHash;
        console.log('PDF comparison (Z3-stored) - Exact match:', pdfMatch);

        return pdfMatch;
      } catch (downloadError) {
        console.log('---Z3 download FAILED with error:', downloadError);
        console.log('---File not found or inaccessible, treating as no match');
        return false; // File doesn't exist or can't be accessed, so no match
      }
    } else {
      console.log('---No PDF comparison conditions met, returning false');
      return false; // No match if neither condition is met
    }
  } catch (outerError) {
    console.log('---isPdfFilesMatch caught outer error:', outerError);
    console.log('---Returning false due to error');
    return false;
  }
};

export const uploadPdfToZ3 = async (
  pdfContent: string,
  globalId: string,
  projectId: string,
  z3Client: Oystehr['z3']
): Promise<string> => {
  const bucketName = `${projectId}-wellness-pdfs`;
  const baseKey = `wellness-pdf-${globalId}.pdf`;
  console.log('---bucketName', bucketName);
  console.log('---baseKey', baseKey);
  console.log('---z3Client', z3Client);
  console.log('---z3Client.listObjects', z3Client.listObjects);

  // List existing files
  const allBucketFiles = await z3Client.listObjects({
    bucketName: bucketName,
    'objectPath+': '',
  });
  console.log('---allBucketFiles', allBucketFiles);

  const existingFiles = allBucketFiles.filter((file) => file.key.includes(`wellness-pdf-${globalId}`));

  // Determine version
  let version = 2;
  let objectKey = baseKey;

  if (existingFiles.length > 0) {
    const versionRegex = new RegExp(`wellness-pdf-${globalId}(?:-v(\\d+))?\\.pdf$`);

    const versions = existingFiles
      .map((file) => {
        const match = file.key.match(versionRegex);
        return match ? (match[1] ? parseInt(match[1]) : 1) : 0;
      })
      .filter((v) => v > 0);

    if (versions.length > 0) {
      version = Math.max(...versions) + 1;
      objectKey = `wellness-pdf-${globalId}-v${version}.pdf`;
    }
  }

  const binaryPdf = Buffer.from(pdfContent, 'base64');
  // Convert Buffer to Uint8Array to satisfy Blob/BlobPart types in TypeScript
  const uint8Array = Uint8Array.from(binaryPdf);
  const blob = new Blob([uint8Array], { type: 'application/pdf' });
  await z3Client.uploadFile({ bucketName, 'objectPath+': objectKey, file: blob });

  return `z3://${bucketName}/${objectKey}`;
};
