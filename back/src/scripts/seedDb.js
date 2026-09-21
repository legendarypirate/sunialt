require('dotenv').config();
const {
  sequelize,
  Admin,
  User,
  Workout,
  Challenge,
  Product,
  Exercise,
  Badge,
  WorkoutSession,
  Setting,
} = require('../models');

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sunia.mn';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const [admin] = await Admin.findOrCreate({
      where: { email: adminEmail },
      defaults: {
        name: 'SUNIA Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'superadmin',
      },
    });
    console.log('Admin ready:', admin.email);

    if (await Workout.count() === 0) {
      await Workout.bulkCreate([
        {
          title: 'Анхны зөв суниалт',
          subtitle: 'Суниагчуудын тайлбартай хөтөлбөр',
          level: 'ЭХЛЭГЧ · 1-Р ДОЛОО ХОНОГ',
          tags: ['Суниалт', 'Техник', 'Амралт'],
          type: 'stretching',
          durationMinutes: 15,
          rewardMinutes: 5,
          sortOrder: 1,
        },
        {
          title: 'Суниалтын суурь',
          subtitle: 'Таны түвшинд тохирсон дасгал',
          level: 'ТАНЫ ТҮВШИНД',
          tags: ['Суниалт', 'Суурь'],
          type: 'stretching',
          durationMinutes: 20,
          rewardMinutes: 5,
          sortOrder: 2,
        },
        {
          title: 'Push-up дасгал',
          subtitle: 'Камер ашиглан тоолно',
          level: 'ДУНД',
          tags: ['Push-up', 'Камер'],
          type: 'push_up',
          durationMinutes: 10,
          rewardMinutes: 5,
          sortOrder: 3,
        },
      ]);
      console.log('Workouts seeded');
    }

    if (await Exercise.count() === 0) {
      await Exercise.bulkCreate([
        {
          title: 'Энгийн суниалт',
          level: 'Анхан шат',
          summary: 'Бүх биеийн суурь хүчийг чангална.',
          description: 'Цээж, мөр, гарын 3 толгойг хамтад нь ажиллуулдаг суурь суниалт.',
          muscles: ['Цээж', 'Мөр', 'Гарын 3 толгой'],
          primaryMuscles: 'Цээжний том булчин',
          secondaryMuscles: 'Мөр, гарын 3 толгой, гол булчин',
          whyPoints: [
            'Бүх биеийн хүчний суурийг тавина.',
            'Цээж, мөр, гарыг нэгэн зэрэг ажиллуулна.',
            'Гэртээ тоног төхөөрөмжгүйгээр хийж болно.',
          ],
          howPoints: [
            'Гараа мөрний өргөнөөр шалан дээр тавина.',
            'Биеэ тоголноос өсгий хүртэл шулуун барина.',
            'Тохойгоо нугалан цээжээ шаланд ойртуулна.',
            'Цээж, гараараа түлхэн босож ирнэ.',
            'Толгойгоо урагшлуулахгүй, нуруугаа хотойлгохгүй.',
          ],
          mistakes: ['Гуз унжуулах', 'Тохой хэт дэлгэх', 'Хэт хурдан буух'],
          targetReps: 15,
          beginnerPlan: '3 × 8',
          standardPlan: '3 × 12',
          advancedPlan: '4 × 15',
          sortOrder: 1,
        },
        {
          title: 'Налуу суниалт',
          level: 'Анхан шат',
          summary: 'Эхлэгчдэд тохиромжтой.',
          description: 'Гараа өндөр гадаргуу дээр тавьж хийдэг хөнгөн хувилбар. Эхлэгчдэд тохиромжтой.',
          muscles: ['Цээж', 'Мөр', 'Гарын 3 толгой'],
          primaryMuscles: 'Цээжний доод ба дунд хэсэг',
          secondaryMuscles: 'Мөр, гарын 3 толгой',
          whyPoints: [
            'Энгийн суниалтаас хөнгөн тул техникийг сурахад амар.',
            'Бугуй, мөрний ачааллыг бууруулна.',
            'Итгэлтэйгээр давталт нэмэхэд тусална.',
          ],
          howPoints: [
            'Гараа ширээ, сандал зэрэг тогтвортой гадаргуу дээр тавина.',
            'Биеэ шулуун шугамд барина.',
            'Цээжээ гадаргуу руу аажмаар ойртуулна.',
            'Гараараа түлхэн эхлэх байрлалд буцна.',
            'Мөрөө чихэндээ шахахгүй.',
          ],
          mistakes: ['Гуз унжуулах', 'Тохой хэт дэлгэх', 'Хөл хэт ойр байлгах'],
          targetReps: 15,
          beginnerPlan: '3 × 8',
          standardPlan: '3 × 12',
          advancedPlan: '4 × 15',
          sortOrder: 2,
        },
        {
          title: 'Задгай суниалт',
          level: 'Дунд шат',
          summary: 'Илүү их хүч, тогтвортой байдал.',
          description: 'Гараа мөрний өргөнөөс илүү задгай тавьж цээжний булчинг илүү ачаална.',
          muscles: ['Цээж', 'Мөр'],
          primaryMuscles: 'Цээжний том булчин',
          secondaryMuscles: 'Урд мөр, гол булчин',
          whyPoints: [
            'Цээжний булчинг илүү өргөн хүрээнд ажиллуулна.',
            'Мөрний тогтвортой байдлыг сайжруулна.',
            'Хүч, хяналтыг зэрэг нэмэгдүүлнэ.',
          ],
          howPoints: [
            'Гараа мөрний өргөнөөс арай өргөн тавина.',
            'Биеэ шулуун барьж plank байрлалд орно.',
            'Тохойгоо 45 орчим градус байлгана.',
            'Цээжээ шаланд ойртуулаад түлхэн босно.',
            'Мөрөө урагшлуулахгүй.',
          ],
          mistakes: ['Гуз унжуулах', 'Тохой хэт дэлгэх', 'Хэт өргөн гар'],
          targetReps: 12,
          beginnerPlan: '3 × 6',
          standardPlan: '3 × 10',
          advancedPlan: '4 × 12',
          sortOrder: 3,
        },
        {
          title: 'Буулах суниалт',
          level: 'Дунд шат',
          summary: 'Доошоо хөдөлгөөнд хяналт.',
          description: 'Доош буух хөдөлгөөн дээр хяналт тавьж хүч, техникийг нэмэгдүүлнэ.',
          muscles: ['Цээж', 'Мөр', 'Гарын 3 толгой'],
          primaryMuscles: 'Цээж ба гарын 3 толгой',
          secondaryMuscles: 'Мөр, гол булчин',
          whyPoints: [
            'Доошоо хөдөлгөөнд илүү хяналт суулгана.',
            'Булчингийн тэсвэр, хүчийг нэмэгдүүлнэ.',
            'Гэмтлээс сэргийлэх зөв техникт сургана.',
          ],
          howPoints: [
            'Энгийн суниалтын байрлалд орно.',
            '3–4 секундэд аажмаар бууна.',
            'Цээж шаланд ойртоход богино амсхийнэ.',
            'Хяналттайгаар түлхэн босно.',
            'Нуруугаа шулуун барина.',
          ],
          mistakes: ['Гуз унжуулах', 'Хэт хурдан буух', 'Тохой түгжиж өргөх'],
          targetReps: 10,
          beginnerPlan: '3 × 6',
          standardPlan: '3 × 8',
          advancedPlan: '4 × 10',
          sortOrder: 4,
        },
        {
          title: 'Алмаз суниалт',
          level: 'Ахисан шат',
          summary: 'Гарын 3 толгой булчин илүү хөдөлнө.',
          description: 'Гарын 3 толгой, цээж, мөрөнд илүү ачаалал өгдөг ахисан түвшний сунгальт.',
          muscles: ['Цээж', 'Мөр', 'Гарын 3 толгой'],
          primaryMuscles: 'Гарын 3 толгой булчин (трицепс)',
          secondaryMuscles: 'Цээж, урд мөр, гол булчин',
          whyPoints: [
            'Гарын 3 толгой хүчийг илүү сайн хөгжүүлнэ.',
            'Цээжний дотор хэсэг болон мөрний тогтвортой байдлыг дэмжинэ.',
            'Энгийн сунгалтаас илүү хяналт, хүч шаарддаг.',
          ],
          howPoints: [
            'Гараа цээжний доор ойр байрлуулж, эрхий ба долоовор хуруугаараа алмааз хэлбэр үүсгэнэ.',
            'Биеэ тоголноос өсгий хүртэл нэг шулуун шугамд барина.',
            'Тохойгоо нугалан цээжээ аажмаар доошлуулна.',
            'Трицепс ба цээжээ ажиллууллан дээш түлхэнэ.',
            'Нуруугаа хотойлгохгүй, тогойгоо хэт дэлгэхгүй.',
          ],
          mistakes: ['Гуз унжуулах', 'Тохой хэт дэлгэх', 'Хэт хурдан буух'],
          targetReps: 8,
          beginnerPlan: '3 × 8',
          standardPlan: '3 × 12',
          advancedPlan: '4 × 15',
          restNote: 'Амралт: сет хооронд 45–60 сек',
          sortOrder: 5,
        },
      ]);
      console.log('Exercises seeded');
    }

    if (await Challenge.count() === 0) {
      await Challenge.bulkCreate([
        {
          name: '1 минутын суналт',
          kind: 'daily',
          description: '60 секундэд хамгийн олон суналт хий.',
          timeLimitSeconds: 60,
          durationDays: 1,
          weeklyGoalDays: 1,
          isActive: true,
        },
        {
          name: 'Тэсвэрийн суналт',
          kind: 'daily',
          description: 'Хамгийн удаан тасралтгүй суналт хий.',
          durationDays: 1,
          weeklyGoalDays: 1,
          isActive: true,
        },
        {
          name: '100 суналт',
          kind: 'daily',
          description: '100 суналтыг хамгийн хурдан дуусга.',
          durationDays: 1,
          weeklyGoalDays: 1,
          isActive: true,
        },
        {
          name: '7 хоногийн челленж',
          kind: 'weekly',
          description: '7 хоног дараалан суниалт хийж дарааллаа хадгалаарай.',
          durationDays: 7,
          weeklyGoalDays: 7,
          isActive: true,
        },
        {
          name: 'Найзууд',
          kind: 'friends',
          description: 'Найзуудтайгаа өрсөлдөж өдрийн оноогоо харьцуулаарай.',
          durationDays: 7,
          weeklyGoalDays: 5,
          isActive: true,
        },
        {
          name: 'Шууд тулаан',
          kind: 'duel',
          description: 'Бодит хүмүүс. Бодит суниалт. Хаана ч байсан.',
          isActive: true,
        },
      ]);
      console.log('Challenges seeded');
    }

    if (await Product.count() === 0) {
      await Product.bulkCreate([
        {
          title: 'Олон үйлдэлт суниалтын тавцан',
          description: 'Олон өнцгөөр суниалт хийх тавцан',
          category: 'Суниалтын төхөөрөмж',
          price: 89000,
          rating: 4.8,
          reviews: 124,
          stock: 40,
          sortOrder: 1,
        },
        {
          title: 'Эвхэгддэг суниалтын тавцан',
          description: 'Гэртээ хэрэглэхэд тохиромжтой эвхэгддэг тавцан',
          category: 'Суниалтын төхөөрөмж',
          price: 69000,
          rating: 4.7,
          reviews: 86,
          stock: 35,
          sortOrder: 2,
        },
        {
          title: 'Резин эсэргүүцлийн багц',
          description: 'Хүч нэмэх резины багц',
          category: 'Дагалдах хэрэгсэл',
          price: 49000,
          rating: 4.6,
          reviews: 53,
          stock: 60,
          sortOrder: 3,
        },
        {
          title: 'Дасгалын дэвсгэр',
          description: 'Тав тухтай дасгалын дэвсгэр',
          category: 'Хувцас',
          price: 39000,
          rating: 4.5,
          reviews: 72,
          stock: 50,
          sortOrder: 4,
        },
      ]);
      console.log('Products seeded');
    }

    if (await Badge.count() === 0) {
      await Badge.bulkCreate([
        { key: 'streak-3', title: '3 өдөр', subtitle: 'дараалал', icon: 'local_fire_department', sortOrder: 1 },
        { key: 'reps-100', title: '100', subtitle: 'суниалт', icon: 'fitness_center', sortOrder: 2 },
        { key: 'reps-1k', title: '1K', subtitle: 'нийт', icon: 'emoji_events', sortOrder: 3 },
        { key: 'early-bird', title: 'Эрт босогч', subtitle: '7AM', icon: 'alarm', sortOrder: 4 },
      ]);
      console.log('Badges seeded');
    }

    const [temka] = await User.findOrCreate({
      where: { email: 'temka123@gmail.com' },
      defaults: {
        email: 'temka123@gmail.com',
        password: 'temka123',
        displayName: 'Тэмка',
        tagline: 'Дисциплин. Эрх чөлөө.',
        streakDays: 12,
        workoutDays: 12,
        completedWorkouts: 124,
        todayPushUps: 50,
        weekPushUps: 320,
        monthPushUps: 1240,
        totalPushUps: 12580,
        weekBars: [50, 80, 40, 70, 50, 90, 60],
        yearBars: [1400, 1600, 1800, 2100, 1900, 2200, 2000, 2300, 2100, 2400, 2200, 2432],
        dailyGoalReps: 100,
        isPlusSubscriber: true,
        subscriptionPlan: 'Pro төлөвлөгөө',
        subscriptionRenewsAt: '2026-06-15',
        lastWorkoutAt: new Date(),
      },
    });

    const leaderSpecs = [
      { email: 'batbold@sunia.mn', displayName: 'Батболд', totalPushUps: 152, todayPushUps: 152, score: 152 },
      { email: 'temuulen@sunia.mn', displayName: 'Тэмүүлэн', totalPushUps: 140, todayPushUps: 140, score: 140 },
      { email: 'saruul@sunia.mn', displayName: 'Саруул', totalPushUps: 128, todayPushUps: 128, score: 128 },
      { email: 'enkhtulga@sunia.mn', displayName: 'Энхтулга', totalPushUps: 115, todayPushUps: 115, score: 115 },
    ];

    const leaderUsers = [];
    for (const spec of leaderSpecs) {
      const [user] = await User.findOrCreate({
        where: { email: spec.email },
        defaults: {
          email: spec.email,
          password: 'demo123',
          displayName: spec.displayName,
          totalPushUps: spec.totalPushUps,
          todayPushUps: spec.todayPushUps,
        },
      });
      leaderUsers.push({ user, score: spec.score });
    }

    if (await WorkoutSession.count() === 0) {
      const now = new Date();
      await WorkoutSession.bulkCreate([
        { userId: temka.id, exerciseTitle: 'Энгийн суниалт', repCount: 50, source: 'workout', completedAt: now },
        ...leaderUsers.map((row) => ({
          userId: row.user.id,
          exerciseTitle: 'Энгийн суниалт',
          repCount: row.score,
          source: 'workout',
          completedAt: now,
        })),
      ]);
      console.log('Demo users and sessions seeded');
    }

    await Setting.findOrCreate({
      where: { key: 'qpay_enabled' },
      defaults: { key: 'qpay_enabled', value: 'true' },
    });
    console.log('QPay settings ready');

    console.log('Seed complete');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
