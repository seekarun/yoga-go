import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { connectToDatabase, disconnectFromDatabase } from '../src/lib/mongodb';
import SurveyModel from '../src/models/Survey';

async function seedSurvey() {
  console.log('[DBG][seed-survey] Starting survey seed...');

  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log('[DBG][seed-survey] Connected to MongoDB');

    // Define expert IDs
    const expertIds = ['deepak', 'kavitha'];

    // Create survey for each expert
    for (const expertId of expertIds) {
      console.log(`[DBG][seed-survey] Creating survey for expert: ${expertId}`);

      // Check if survey already exists
      const existingSurvey = await SurveyModel.findOne({
        expertId,
        isActive: true,
      }).lean();

      if (existingSurvey) {
        console.log(`[DBG][seed-survey] Survey already exists for ${expertId}, skipping...`);
        continue;
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
      console.log(`[DBG][seed-survey] ✓ Created survey for expert: ${expertId}`);
    }

    console.log('[DBG][seed-survey] ✓ Survey seed completed');
  } catch (error) {
    console.error('[DBG][seed-survey] Error seeding survey:', error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
    console.log('[DBG][seed-survey] Disconnected from MongoDB');
  }
}

// Run the seed script
seedSurvey();
