import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { connectToDatabase, disconnectFromDatabase } from '../src/lib/mongodb';
import SurveyModel from '../src/models/Survey';

async function seedSurveyForTester() {
  console.log('[DBG][seed-survey-tester] Starting survey seed for tester expert...');

  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log('[DBG][seed-survey-tester] Connected to MongoDB');

    const expertId = 'tester';

    // Check if survey already exists
    const existingSurvey = await SurveyModel.findOne({
      expertId,
      isActive: true,
    }).lean();

    if (existingSurvey) {
      console.log(
        '[DBG][seed-survey-tester] Survey already exists for tester, deleting old survey...'
      );
      await SurveyModel.deleteOne({ _id: (existingSurvey as any)._id });
      console.log('[DBG][seed-survey-tester] Deleted old survey');
    }

    // Create survey
    const surveyId = `survey_${expertId}_${Date.now()}`;
    const survey = new SurveyModel({
      _id: surveyId,
      expertId,
      title: 'Tell us about yourself',
      description: 'Help us understand you better so we can provide a personalized experience.',
      questions: [
        {
          id: 'q1',
          questionText: 'What is your age?',
          type: 'multiple-choice',
          options: [
            { id: 'opt1', label: '18-25' },
            { id: 'opt2', label: '26-35' },
            { id: 'opt3', label: '35 and above' },
          ],
          required: true,
          order: 1,
        },
      ],
      isActive: true,
    });

    await survey.save();
    console.log(`[DBG][seed-survey-tester] ✓ Created survey for expert: ${expertId}`);
    console.log(`[DBG][seed-survey-tester] Survey ID: ${surveyId}`);
    console.log('[DBG][seed-survey-tester] ✓ Survey seed completed for tester');
  } catch (error) {
    console.error('[DBG][seed-survey-tester] Error seeding survey:', error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
    console.log('[DBG][seed-survey-tester] Disconnected from MongoDB');
  }
}

// Run the seed script
seedSurveyForTester();
