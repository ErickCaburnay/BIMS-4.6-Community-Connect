// ######################### INDEX.JS INSIDE FUNCTIONS FOLDER #############################
const { onCall } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();

// Set global options
setGlobalOptions({
  region: 'asia-southeast1',
  memory: '256MB',
  timeoutSeconds: 300
});

const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: 'sadepadua1@gmail.com',
      pass: 'pwtn zdgy gqta gojo'
  }
});

exports.sendOTP = onCall(async (request) => {
  try {
    const { email } = request.data;
    if (!email) {
      throw new Error('Email is required');
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in Firestore
    await admin.firestore().collection('otps').doc(email.toLowerCase()).set({
      code: otp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 5 * 60 * 1000)
      ),
      attempts: 0
    });

    // Send email
    const mailOptions = {
      from: 'sadepadua1@gmail.com',
      to: email,
      subject: 'Login Verification Code',
      html: `
        <h1>Your Verification Code</h1>
        <p>Your verification code is: <strong>${otp}</strong>. 
        This verification code is valid for 5 minutes after generation. 
        Please do not share this code with anyone.</p>
        <p>This is an automatically generated email. Please do not reply.</p>

        <p>___________________________________________________________________</p>

      `
    };

    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully to:', email);
    
    return { 
      success: true,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('Error in sendOTP:', error);
    throw new Error(error.message);
  }
});

exports.verifyOTP = onCall({ 
  cors: true,
  maxInstances: 10
}, async (request) => {
  if (!request?.data?.email || !request?.data?.code) {
      return {
          success: false,
          error: 'INVALID_PARAMS',
          message: 'Email and code are required'
      };
  }

  const { email, code } = request.data;

  try {
      // Get OTP document
      const otpRef = admin.firestore().collection('otps').doc(email.toLowerCase());
      const otpDoc = await otpRef.get();

      // Check if OTP exists
      if (!otpDoc.exists) {
          return {
              success: false,
              error: 'NOT_FOUND',
              message: 'OTP not found or expired'
          };
      }

      const otpData = otpDoc.data();

      // Check expiration
      const now = admin.firestore.Timestamp.now();
      if (now.seconds > otpData.expiresAt.seconds) {
          await otpRef.delete();
          return {
              success: false,
              error: 'EXPIRED',
              message: 'OTP has expired'
          };
      }

      // Check attempts
      if (otpData.attempts >= 3) {
          await otpRef.delete();
          return {
              success: false,
              error: 'MAX_ATTEMPTS',
              message: 'Too many invalid attempts'
          };
      }

      // Verify OTP code
      if (otpData.code !== code) {
          await otpRef.update({
              attempts: admin.firestore.FieldValue.increment(1)
          });
          return {
              success: false,
              error: 'INVALID_CODE',
              message: 'Incorrect OTP code'
          };
      }

      // Success - delete OTP
      await otpRef.delete();
      
      return { 
          success: true,
          message: 'OTP verified successfully'
      };
  } catch (error) {
      console.error('Verification error:', error.stack);
      return {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'An error occurred during verification'
      };
  }
});

exports.handleUserDeletion = functions.firestore
    .document('users/{userId}')
    .onDelete(async (snapshot, context) => {
        try {
            const deletedUser = snapshot.data();
            const deletedUserFullName = `${deletedUser.firstName} ${deletedUser.middleName} ${deletedUser.lastName}`.trim().toUpperCase();

            // Find households where the deleted user was the head
            const householdsRef = db.collection('Household');
            const householdQuery = await householdsRef.where('head', '==', deletedUserFullName).get();

            if (householdQuery.empty) {
                console.log('No households found with this head');
                return;
            }

            for (const householdDoc of householdQuery.docs) {
                const householdData = householdDoc.data();
                const members = householdData.householdMembers || [];

                if (members.length === 0) {
                    // If no members, delete the household
                    await householdDoc.ref.delete();
                    console.log(`Deleted household ${householdDoc.id} as it had no members`);
                    continue;
                }

                // Get all members' details from users collection
                const memberDetails = await Promise.all(
                    members.map(async memberName => {
                        const userQuery = await db.collection('users')
                            .where('firstName', '==', memberName.split(' ')[0])
                            .where('lastName', '==', memberName.split(' ').slice(-1)[0])
                            .get();
                        
                        if (!userQuery.empty) {
                            const userData = userQuery.docs[0].data();
                            return {
                                fullName: memberName,
                                birthDate: userData.birthdate || userData.birthDate,
                                userData: userData
                            };
                        }
                        return null;
                    })
                );

                // Filter out any null values and sort by birth date
                const validMembers = memberDetails
                    .filter(member => member !== null)
                    .sort((a, b) => {
                        const dateA = a.birthDate && a.birthDate.toDate ? a.birthDate.toDate() : new Date(a.birthDate);
                        const dateB = b.birthDate && b.birthDate.toDate ? b.birthDate.toDate() : new Date(b.birthDate);
                        return dateA - dateB; // Ascending order (oldest first)
                    });

                if (validMembers.length === 0) {
                    // If no valid members found, delete the household
                    await householdDoc.ref.delete();
                    console.log(`Deleted household ${householdDoc.id} as it had no valid members`);
                    continue;
                }

                // Select the oldest member (first in the sorted array)
                const newHead = validMembers[0];

                // Update household document
                const updatedMembers = members.filter(member => member !== newHead.fullName);
                const updates = {
                    head: newHead.fullName,
                    householdMembers: updatedMembers,
                    address: `${newHead.userData.blklot || ''} ${newHead.userData.street || ''}`.trim(),
                    phone: newHead.userData.phone || householdData.phone,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                    updatedBy: 'system',
                    updateReason: 'Previous head removal'
                };

                await householdDoc.ref.update(updates);
                
                // Create a log entry
                await db.collection('Logs').add({
                    action: 'HOUSEHOLD_HEAD_REPLACEMENT',
                    previousHead: deletedUserFullName,
                    newHead: newHead.fullName,
                    householdId: householdData.householdId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    reason: 'User deletion',
                    systemGenerated: true
                });

                console.log(`Updated household ${householdDoc.id} with new head: ${newHead.fullName}`);
            }

        } catch (error) {
            console.error('Error in handleUserDeletion:', error);
            throw error;
        }
    });exports.handleUserDeletion = functions.firestore
    .document('users/{userId}')
    .onDelete(async (snapshot, context) => {
        try {
            const deletedUser = snapshot.data();
            const deletedUserFullName = `${deletedUser.firstName} ${deletedUser.middleName} ${deletedUser.lastName}`.trim().toUpperCase();

            // Find households where the deleted user was the head
            const householdsRef = db.collection('Household');
            const householdQuery = await householdsRef.where('head', '==', deletedUserFullName).get();

            if (householdQuery.empty) {
                console.log('No households found with this head');
                return;
            }

            for (const householdDoc of householdQuery.docs) {
                const householdData = householdDoc.data();
                const members = householdData.householdMembers || [];

                if (members.length === 0) {
                    // If no members, delete the household
                    await householdDoc.ref.delete();
                    console.log(`Deleted household ${householdDoc.id} as it had no members`);
                    continue;
                }

                // Get all members' details from users collection
                const memberDetails = await Promise.all(
                    members.map(async memberName => {
                        // Split the full name into parts
                        const nameParts = memberName.split(' ');
                        const firstName = nameParts[0];
                        const lastName = nameParts[nameParts.length - 1];

                        // Query using firstName AND lastName for more accurate results
                        const userQuery = await db.collection('users')
                            .where('firstName', '==', firstName)
                            .where('lastName', '==', lastName)
                            .get();

                        if (!userQuery.empty) {
                            const userData = userQuery.docs[0].data();
                            
                            // Convert birthDate to timestamp if it's a string
                            let birthDate = userData.birthdate || userData.birthDate;
                            if (birthDate && typeof birthDate === 'string') {
                                birthDate = admin.firestore.Timestamp.fromDate(new Date(birthDate));
                            }

                            return {
                                fullName: memberName,
                                birthDate: birthDate,
                                userData: userData
                            };
                        }
                        console.log(`Member not found in users collection: ${memberName}`);
                        return null;
                    })
                );

                // Filter out any null values and sort by birth date
                const validMembers = memberDetails
                    .filter(member => member !== null && member.birthDate)
                    .sort((a, b) => {
                        // Ensure we're comparing dates properly
                        const dateA = a.birthDate.toDate ? a.birthDate.toDate() : new Date(a.birthDate);
                        const dateB = b.birthDate.toDate ? b.birthDate.toDate() : new Date(b.birthDate);
                        return dateA - dateB; // Ascending order (oldest first)
                    });

                console.log(`Valid members found: ${validMembers.length}`);

                if (validMembers.length === 0) {
                    // Log the issue but DON'T delete the household
                    console.log(`No valid members found for household ${householdDoc.id}, but keeping household record`);
                    continue;
                }

                // Select the oldest member (first in the sorted array)
                const newHead = validMembers[0];
                console.log(`Selected new head: ${newHead.fullName}, Birth date: ${newHead.birthDate}`);

                // Update household document
                const updatedMembers = members.filter(member => member !== newHead.fullName);
                const updates = {
                    head: newHead.fullName,
                    householdMembers: updatedMembers,
                    address: `${newHead.userData.blklot || ''} ${newHead.userData.street || ''}`.trim(),
                    phone: newHead.userData.phone || householdData.phone,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                    updatedBy: 'system',
                    updateReason: 'Previous head removal',
                    totalMembers: updatedMembers.length + 1 // Update total members count
                };

                await householdDoc.ref.update(updates);
                
                // Create a log entry
                await db.collection('Logs').add({
                    action: 'HOUSEHOLD_HEAD_REPLACEMENT',
                    previousHead: deletedUserFullName,
                    newHead: newHead.fullName,
                    householdId: householdData.householdId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    reason: 'User deletion',
                    systemGenerated: true
                });

                console.log(`Updated household ${householdDoc.id} with new head: ${newHead.fullName}`);
            }

        } catch (error) {
            console.error('Error in handleUserDeletion:', error);
            throw error;
        }
    });

    // Archive admin accounts after 24 hours
exports.archiveAdmin = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
        // Get admins pending archive
        const snapshot = await db.collection('Admin_Accounts')
            .where('status', '==', 'pending_archive')
            .where('archiveDate', '<=', now)
            .get();

        if (snapshot.empty) {
            console.log('No admins to archive');
            return null;
        }

        const batch = db.batch();

        snapshot.docs.forEach((doc) => {
            const adminData = doc.data();
            
            // Add to archived collection
            const archivedRef = db.collection('archived_admin_accounts').doc(doc.id);
            batch.set(archivedRef, {
                ...adminData,
                archivedAt: now
            });

            // Delete from active collection
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Archived ${snapshot.size} admin accounts`);
        return null;
    } catch (error) {
        console.error('Error archiving admins:', error);
        return null;
    }
});

// HANDLES THE 24HR COUNTDOWN FOR ADMIN TURNOVER

exports.processTurnoverRequests = functions.pubsub
    .schedule('every 1 hours')
    .onRun(async (context) => {
        try {
            const turnoversRef = db.collection('Turnover');
            const now = admin.firestore.Timestamp.now();
            
            // Query turnovers that are in-progress and past 24 hours
            const query = turnoversRef
                .where('status', '==', 'in-progress')
                .where('submissionTime', '<=', 
                    //admin.firestore.Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000));
                    admin.firestore.Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000));
            
            const snapshot = await query.get();
            
            const batch = db.batch();
            const processingPromises = [];

            snapshot.forEach(doc => {
                const turnoverData = doc.data();
                processingPromises.push(processTurnover(turnoverData, batch));
            });

            await Promise.all(processingPromises);
            await batch.commit();

            // Log processing results
            await logAuditEvent('turnover_batch_processing', {
                processedCount: snapshot.size,
                timestamp: now
            });

            return { processed: snapshot.size };
        } catch (error) {
            console.error('Error processing turnovers:', error);
            throw error;
        }
    });

async function processTurnover(turnoverData, batch) {
    const { outgoingAdminId, incomingAdmin, turnoverId } = turnoverData;

    // Archive outgoing admin
    const outgoingAdminRef = db.collection('Admin_Accounts').doc(outgoingAdminId);
    const outgoingAdminSnap = await outgoingAdminRef.get();
    
    if (outgoingAdminSnap.exists) {
        const outgoingData = outgoingAdminSnap.data();
        
        // Create archived admin document
        const archivedRef = db.collection('archived_admin_accounts').doc(outgoingAdminId);
        batch.set(archivedRef, {
            ...outgoingData,
            admin: false,
            archivedBy: incomingAdmin.adminId,
            archivedDate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Delete original admin document
        batch.delete(outgoingAdminRef);
    }

    // Activate incoming admin
    const incomingAdminRef = db.collection('Admin_Accounts').doc(incomingAdmin.adminId);
    batch.update(incomingAdminRef, {
        status: 'active',
        activatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update turnover status
    const turnoverRef = db.collection('Turnover').doc(turnoverId);
    batch.update(turnoverRef, {
        status: 'completed',
        completionTime: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log the turnover completion
    await logAuditEvent('turnover_completed', {
        turnoverId,
        outgoingAdminId,
        incomingAdminId: incomingAdmin.adminId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
}