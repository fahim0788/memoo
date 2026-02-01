import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const QUESTIONS: [string, string[]][] = [
  ["Quelle est la devise de la France ?", ["liberté égalité fraternité"]],
  ["Quelles sont les couleurs du drapeau français ?", ["bleu blanc rouge", "bleu blanc et rouge"]],
  ["Quel est l'hymne national français ?", ["la marseillaise"]],
  ["Quelle est la capitale de la France ?", ["paris"]],
  ["Quelle est la langue officielle de la France ?", ["le français", "français"]],
  ["Quel est le régime politique de la France ?", ["république", "république démocratique"]],
  ["Quel est le nom de la République française actuelle ?", ["la cinquième république", "cinquième république"]],
  ["Qui est le chef de l'État en France ?", ["le président de la république", "président de la république"]],
  ["Pour combien d'années est élu le président de la République ?", ["5 ans", "cinq ans"]],
  ["Qui dirige le gouvernement en France ?", ["le premier ministre", "premier ministre"]],
  ["Quel organe vote les lois en France ?", ["le parlement", "parlement"]],
  ["De quelles assemblées est composé le Parlement ?", ["assemblée nationale et sénat", "le sénat et l'assemblée nationale"]],
  ["Qui élit les députés ?", ["les citoyens", "le peuple"]],
  ["Qui élit les sénateurs ?", ["les grands électeurs"]],
  ["Quel est le rôle principal du président de la République ?", ["représenter l'état", "garant des institutions"]],
  ["Quel texte fonde les droits et libertés en France ?", ["la déclaration des droits de l'homme et du citoyen"]],
  ["En quelle année a été adoptée la Déclaration des droits de l'homme et du citoyen ?", ["1789"]],
  ["La France est-elle un État laïque ?", ["oui"]],
  ["Que signifie la laïcité ?", ["séparation des religions et de l'état"]],
  ["Peut-on pratiquer librement sa religion en France ?", ["oui"]],
  ["Quel est l'âge légal pour voter en France ?", ["18 ans", "dix-huit ans"]],
  ["Le vote est-il un droit ou un devoir ?", ["un droit", "un devoir civique"]],
  ["Les femmes ont-elles les mêmes droits que les hommes en France ?", ["oui"]],
  ["Quelle est la fête nationale française ?", ["le 14 juillet", "quatorze juillet"]],
  ["Que commémore le 14 juillet ?", ["la prise de la bastille"]],
  ["Quel est le symbole de la République française ?", ["marianne"]],
  ["Quel animal symbolise la France ?", ["le coq"]],
  ["Quels sont les trois pouvoirs en France ?", ["exécutif législatif judiciaire"]],
  ["Qui exerce le pouvoir judiciaire ?", ["les tribunaux", "la justice"]],
  ["Quel est le rôle de la justice ?", ["faire respecter la loi"]],
  ["La France fait-elle partie de l'Union européenne ?", ["oui"]],
  ["Quelle est la monnaie utilisée en France ?", ["l'euro", "euro"]],
  ["Peut-on exprimer librement ses opinions en France ?", ["oui"]],
  ["La liberté d'expression a-t-elle des limites ?", ["oui"]],
  ["L'école est-elle obligatoire en France ?", ["oui"]],
  ["À partir de quel âge l'école est-elle obligatoire ?", ["3 ans", "trois ans"]],
  ["L'enseignement public est-il gratuit ?", ["oui"]],
  ["Les services publics sont-ils accessibles à tous ?", ["oui"]],
  ["Faut-il respecter les lois françaises ?", ["oui"]],
  ["Peut-on être sanctionné si on ne respecte pas la loi ?", ["oui"]],
  ["La France est-elle une démocratie ?", ["oui"]],
  ["Qui fait appliquer les lois ?", ["le gouvernement"]],
  ["Peut-on manifester en France ?", ["oui"]],
  ["Les hommes et les femmes votent-ils depuis la même époque ?", ["non"]],
  ["En quelle année les femmes ont-elles obtenu le droit de vote ?", ["1944"]],
  ["Peut-on changer de religion en France ?", ["oui"]],
  ["La loi est-elle la même pour tous ?", ["oui"]],
  ["Peut-on être jugé sans procès ?", ["non"]],
  ["Qui rend la justice ?", ["les juges", "le juge"]],
  ["Le travail est-il un droit ?", ["oui"]],
  ["Le travail des enfants est-il autorisé ?", ["non"]],
  ["Peut-on faire grève en France ?", ["oui"]],
  ["La liberté de la presse existe-t-elle ?", ["oui"]],
  ["Les médias sont-ils libres ?", ["oui"]],
  ["Peut-on critiquer le gouvernement ?", ["oui"]],
  ["La torture est-elle autorisée ?", ["non"]],
  ["La peine de mort existe-t-elle en France ?", ["non"]],
  ["En quelle année la peine de mort a-t-elle été abolie ?", ["1981"]],
  ["Peut-on se marier librement en France ?", ["oui"]],
  ["Le mariage forcé est-il autorisé ?", ["non"]],
  ["Les couples de même sexe peuvent-ils se marier ?", ["oui"]],
  ["Peut-on divorcer en France ?", ["oui"]],
  ["L'égalité est-elle un principe fondamental ?", ["oui"]],
  ["La France protège-t-elle la liberté individuelle ?", ["oui"]],
  ["Le racisme est-il puni par la loi ?", ["oui"]],
  ["La discrimination est-elle interdite ?", ["oui"]],
  ["Peut-on créer une association librement ?", ["oui"]],
  ["Peut-on créer un parti politique ?", ["oui"]],
  ["La France est-elle un État unitaire ?", ["oui"]],
  ["Les collectivités locales existent-elles ?", ["oui"]],
  ["Peut-on être élu sans être français ?", ["non"]],
  ["Les lois s'appliquent-elles sur tout le territoire ?", ["oui"]],
  ["Le service militaire est-il obligatoire ?", ["non"]],
  ["Existe-t-il une journée de défense et citoyenneté ?", ["oui"]],
  ["La France protège-t-elle les droits de l'enfant ?", ["oui"]],
  ["La liberté de conscience existe-t-elle ?", ["oui"]],
  ["Les syndicats sont-ils autorisés ?", ["oui"]],
  ["La France est-elle membre de l'ONU ?", ["oui"]],
  ["La France est-elle un pays européen ?", ["oui"]],
  ["Les citoyens peuvent-ils voter par référendum ?", ["oui"]],
  ["Le président peut-il dissoudre l'Assemblée nationale ?", ["oui"]],
  ["La Constitution est-elle la loi suprême ?", ["oui"]],
  ["La justice est-elle indépendante ?", ["oui"]],
  ["La police doit-elle respecter la loi ?", ["oui"]],
  ["La liberté de circulation existe-t-elle ?", ["oui"]],
  ["Peut-on quitter le territoire librement ?", ["oui"]],
  ["La France reconnaît-elle les droits de l'homme ?", ["oui"]],
  ["Les impôts servent-ils à financer les services publics ?", ["oui"]],
  ["Payer ses impôts est-il obligatoire ?", ["oui"]],
  ["Respecter autrui est-il une valeur républicaine ?", ["oui"]],
  ["La fraternité est-elle une valeur française ?", ["oui"]],
  ["La liberté est-elle une valeur française ?", ["oui"]],
  ["L'égalité est-elle une valeur française ?", ["oui"]],
  ["La France protège-t-elle la liberté de réunion ?", ["oui"]],
  ["Peut-on accéder à la justice gratuitement ?", ["oui"]],
  ["La France reconnaît-elle la diversité ?", ["oui"]],
  ["Les lois peuvent-elles évoluer ?", ["oui"]],
  ["La République est-elle indivisible ?", ["oui"]],
  ["La France protège-t-elle les libertés fondamentales ?", ["oui"]],
  ["Respecter la République est-il obligatoire ?", ["oui"]],
];

async function main() {
  const existing = await prisma.deck.findFirst({
    where: { name: "Naturalisation française" },
  });

  if (existing) {
    console.log("Deck 'Naturalisation française' existe déjà — skip.");
    return;
  }

  await prisma.deck.create({
    data: {
      name: "Naturalisation française",
      cards: {
        create: QUESTIONS.map(([question, answers]) => ({
          question,
          answers,
        })),
      },
    },
  });

  console.log(`Seeded: Naturalisation française (${QUESTIONS.length} cartes)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
