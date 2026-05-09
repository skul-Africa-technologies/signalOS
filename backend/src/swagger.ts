import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('signalOS — Economic Intelligence API')
    .setDescription(
      `## Intelligent Economic Infrastructure for Africa's Informal Economy

An event-driven platform that converts behavioral financial activity into programmable financial trust for informal workers, traders, artisans, and freelancers.

---

### Intelligence Pipeline

\`\`\`
User Activity
  → Payment Events (Squad)
  → Transaction Persistence
  → Signal Extraction
  → Trust Score Recalculation
  → Economic Profile Updates
  → Loan Eligibility Recalculation
  → Recommendation Generation
\`\`\`

### Event-Driven Architecture

| Event | Triggers |
|-------|----------|
| \`payment.success\` | Signal extraction · Trust recalculation · Profile update |
| \`savings.contribution\` | Savings reliability update · Trust recalculation |

### Authentication
All protected endpoints require a **Bearer JWT token**.
Obtain a token via \`POST /auth/login\` and click **Authorize** above.
`,
    )
    .setVersion('1.0.0')
    .setContact('signalOS', 'https://github.com/signalOS', 'api@signalos.io')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter JWT token from /auth/login' },
      'JWT',
    )
    .addTag('Authentication', 'User registration, login, and JWT issuance')
    .addTag('Users', 'Authenticated user profile retrieval')
    .addTag('Economic Identity', 'Behavioral signal extraction and economic profile management')
    .addTag('Payments', 'Squad payment initiation and webhook processing')
    .addTag('Transactions', 'Transaction history and persistence')
    .addTag('Trust Scores', 'Behavioral trust scoring and risk assessment engine')
    .addTag('Savings Groups', 'Cooperative savings group management')
    .addTag('Contributions', 'Savings contribution tracking and analytics')
    .addTag('Loan Eligibility', 'Behavioral credit scoring and loan eligibility engine')
    .addTag('Recommendations', 'AI-driven financial opportunity recommendations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'signalOS API Docs',
  });
}
