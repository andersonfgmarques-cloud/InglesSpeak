import { DictionaryWord } from '../types';

export interface BibleVerse {
  id: string;
  reference: string;
  text: string;
  translation: string;
  simplifiedPronunciation: string;
  category: string;
  keywords: string[]; // Words to highlight for "Word by Word" study
}

export const BIBLE_VERSES: BibleVerse[] = [
  {
    id: 'phil-4-13',
    reference: 'Philippians 4:13',
    text: 'I can do all things through Christ which strengtheneth me.',
    translation: 'Posso todas as coisas em Cristo que me fortalece.',
    simplifiedPronunciation: 'Ai quén du ól tings tru craist uitch istren-ten-ét mi',
    category: 'Faith',
    keywords: ['through', 'strengtheneth', 'things']
  },
  {
    id: 'psalm-23-1',
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd; I shall not want.',
    translation: 'O Senhor é o meu pastor; nada me faltará.',
    simplifiedPronunciation: 'Dâ lórd iz mai chép-érd; ai chél nót uónt',
    category: 'Hope',
    keywords: ['shepherd', 'shall', 'want']
  },
  {
    id: 'joshua-1-9',
    reference: 'Joshua 1:9',
    text: 'Be strong and of a good courage; be not afraid.',
    translation: 'Sê forte e de bom ânimo; não temas.',
    simplifiedPronunciation: 'Bi istróng énd óv ei gúd câ-rêidj; bi nót a-frêid',
    category: 'Courage',
    keywords: ['courage', 'afraid', 'strong']
  },
  {
    id: 'proverbs-3-5',
    reference: 'Proverbs 3:5',
    text: 'Trust in the Lord with all thine heart.',
    translation: 'Confia no Senhor de todo o teu coração.',
    simplifiedPronunciation: 'Trást in dâ lórd uít ól dáin hárt',
    category: 'Faith',
    keywords: ['trust', 'thine', 'heart']
  },
  {
    id: '1thess-5-18',
    reference: '1 Thessalonians 5:18',
    text: 'In every thing give thanks.',
    translation: 'Em tudo dai graças.',
    simplifiedPronunciation: 'In é-vri ting guív ténks',
    category: 'Gratitude',
    keywords: ['every', 'thanks', 'give']
  },
  {
    id: 'proverbs-16-16',
    reference: 'Proverbs 16:16',
    text: 'How much better is it to get wisdom than gold!',
    translation: 'Quanto melhor é adquirir a sabedoria do que o ouro!',
    simplifiedPronunciation: 'Ráu mâtch bét-ér iz it tu guét uíz-dôm dén góuld',
    category: 'Wisdom',
    keywords: ['wisdom', 'better', 'gold']
  },
  {
    id: '1john-4-8',
    reference: '1 John 4:8',
    text: 'He that loveth not knoweth not God; for God is love.',
    translation: 'Aquele que não ama não conhece a Deus; porque Deus é amor.',
    simplifiedPronunciation: 'Ri dét lá-vét nót nô-uét nót gód; fór gód iz láv',
    category: 'Love',
    keywords: ['loveth', 'knoweth', 'love']
  },
  {
    id: 'john-14-27',
    reference: 'John 14:27',
    text: 'Peace I leave with you, my peace I give unto you.',
    translation: 'Deixo-vos a paz, a minha paz vos dou.',
    simplifiedPronunciation: 'Pís ai lív uít iú, mai pís ai guív án-tu iú',
    category: 'Peace',
    keywords: ['peace', 'leave', 'give']
  },
  {
    id: 'gal-5-22',
    reference: 'Galatians 5:22',
    text: 'But the fruit of the Spirit is love, joy, peace, longsuffering.',
    translation: 'Mas o fruto do Espírito é amor, alegria, paz, longanimidade.',
    simplifiedPronunciation: 'Bát dâ frút óv dâ ispí-rit iz láv, djói, pís, lóng-sâ-fê-ring',
    category: 'Joy',
    keywords: ['fruit', 'spirit', 'longsuffering']
  },
  {
    id: 'psalm-37-7',
    reference: 'Psalm 37:7',
    text: 'Rest in the Lord, and wait patiently for him.',
    translation: 'Descansa no Senhor e espera nele com paciência.',
    simplifiedPronunciation: 'Rést in dâ lórd, énd uêit pêi-chênt-li fór rím',
    category: 'Patience',
    keywords: ['rest', 'wait', 'patiently']
  },
  {
    id: 'eph-4-32',
    reference: 'Ephesians 4:32',
    text: 'And be ye kind one to another, tenderhearted, forgiving one another.',
    translation: 'Antes sede uns para com os outros benignos, misericordiosos, perdoando-vos uns aos outros.',
    simplifiedPronunciation: 'Énd bi ií cáind uán tu a-ná-dêr, tén-dêr-hár-têd, fór-guí-ving uán a-ná-dêr',
    category: 'Kindness',
    keywords: ['kind', 'tenderhearted', 'forgiving']
  },
  {
    id: 'matt-6-14',
    reference: 'Matthew 6:14',
    text: 'For if ye forgive men their trespasses, your heavenly Father will also forgive you.',
    translation: 'Porque, se perdoardes aos homens as suas ofensas, também vosso Pai celestial vos perdoará a vós.',
    simplifiedPronunciation: 'Fór íf ií fór-guív mén dér trés-pá-sêz, iór ré-vên-li fá-dêr uíl ól-sô fór-guív iú',
    category: 'Forgiveness',
    keywords: ['forgive', 'trespasses', 'heavenly']
  },
  {
    id: 'james-4-10',
    reference: 'James 4:10',
    text: 'Humble yourselves in the sight of the Lord, and he shall lift you up.',
    translation: 'Humilhai-vos perante o Senhor, e ele vos exaltará.',
    simplifiedPronunciation: 'Rám-bôl iór-sélvz in dâ sáit óv dâ lórd, énd ri chél líft iú áp',
    category: 'Humility',
    keywords: ['humble', 'sight', 'lift']
  },
  {
    id: 'isaiah-40-31',
    reference: 'Isaiah 40:31',
    text: 'But they that wait upon the Lord shall renew their strength.',
    translation: 'Mas os que esperam no Senhor renovarão as suas forças.',
    simplifiedPronunciation: 'Bát dêi dét uêit a-pón dâ lórd chél ri-niú dér istrengt',
    category: 'Strength',
    keywords: ['wait', 'renew', 'strength']
  },
  {
    id: 'psalm-147-3',
    reference: 'Psalm 147:3',
    text: 'He healeth the broken in heart, and bindeth up their wounds.',
    translation: 'Ele sara os quebrantados de coração e liga-lhes as feridas.',
    simplifiedPronunciation: 'Ri rí-lét dâ brô-kên in hárt, énd báin-dét áp dér uúndz',
    category: 'Healing',
    keywords: ['healeth', 'broken', 'wounds']
  },
  {
    id: 'psalm-121-7',
    reference: 'Psalm 121:7',
    text: 'The Lord shall preserve thee from all evil.',
    translation: 'O Senhor te guardará de todo o mal.',
    simplifiedPronunciation: 'Dâ lórd chél pri-zérv dí fróm ól í-vôl',
    category: 'Protection',
    keywords: ['preserve', 'evil', 'thee']
  },
  {
    id: 'psalm-32-8',
    reference: 'Psalm 32:8',
    text: 'I will instruct thee and teach thee in the way which thou shalt go.',
    translation: 'Instruir-te-ei e ensinar-te-ei o caminho que deves seguir.',
    simplifiedPronunciation: 'Ai uíl in-istráct dí énd títch dí in dâ uêi uitch dáu chált gô',
    category: 'Guidance',
    keywords: ['instruct', 'teach', 'way']
  },
  {
    id: 'phil-4-19',
    reference: 'Philippians 4:19',
    text: 'But my God shall supply all your need according to his riches.',
    translation: 'O meu Deus, segundo as suas riquezas, suprirá todas as vossas necessidades.',
    simplifiedPronunciation: 'Bát mai gód chél sâ-plái ól iór níd a-cór-ding tu ríz rí-tchêz',
    category: 'Provision',
    keywords: ['supply', 'need', 'riches']
  },
  {
    id: 'psalm-103-8',
    reference: 'Psalm 103:8',
    text: 'The Lord is merciful and gracious, slow to anger, and plenteous in mercy.',
    translation: 'Misericordioso e piedoso é o Senhor; longânimo e grande em misericórdia.',
    simplifiedPronunciation: 'Dâ lórd iz mér-si-fôl énd grêi-châs, islô tu én-guêr, énd plén-tchâs in mér-si',
    category: 'Mercy',
    keywords: ['merciful', 'gracious', 'mercy']
  },
  {
    id: 'eph-2-8',
    reference: 'Ephesians 2:8',
    text: 'For by grace are ye saved through faith.',
    translation: 'Porque pela graça sois salvos, por meio da fé.',
    simplifiedPronunciation: 'Fór bái grêis ár ií sêivd tru fêit',
    category: 'Grace',
    keywords: ['grace', 'saved', 'faith']
  },
  {
    id: 'john-8-32',
    reference: 'John 8:32',
    text: 'And ye shall know the truth, and the truth shall make you free.',
    translation: 'E conhecereis a verdade, e a verdade vos libertará.',
    simplifiedPronunciation: 'Énd ií chél nô dâ trút, énd dâ trút chél mêic iú frí',
    category: 'Truth',
    keywords: ['know', 'truth', 'free']
  },
  {
    id: 'amos-5-24',
    reference: 'Amos 5:24',
    text: 'But let judgment run down as waters, and righteousness as a mighty stream.',
    translation: 'Corra, porém, o juízo como as águas, e a justiça como o ribeiro impetuoso.',
    simplifiedPronunciation: 'Bát lét djádj-mênt rán dáun éz uó-têrz, énd rái-tchâs-nés éz ei mái-ti istrím',
    category: 'Justice',
    keywords: ['judgment', 'righteousness', 'stream']
  },
  {
    id: 'romans-5-3',
    reference: 'Romans 5:3',
    text: 'But we glory in tribulations also: knowing that tribulation worketh patience.',
    translation: 'Mas também nos gloriamos nas tribulações, sabendo que a tribulação produz a paciência.',
    simplifiedPronunciation: 'Bát uí gló-ri in tri-biu-lêi-chânz ól-sô: nô-ing dét tri-biu-lêi-chân uór-két pêi-chêns',
    category: 'Perseverance',
    keywords: ['glory', 'tribulations', 'patience']
  },
  {
    id: '2cor-1-3',
    reference: '2 Corinthians 1:3',
    text: 'Blessed be God, the Father of mercies, and the God of all comfort.',
    translation: 'Bendito seja Deus, o Pai das misericórdias e o Deus de toda a consolação.',
    simplifiedPronunciation: 'Blé-sêd bi gód, dâ fá-dêr óv mér-siz, énd dâ gód óv ól cám-fórt',
    category: 'Comfort',
    keywords: ['blessed', 'mercies', 'comfort']
  },
  {
    id: 'jer-29-11',
    reference: 'Jeremiah 29:11',
    text: 'For I know the thoughts that I think toward you, saith the Lord.',
    translation: 'Porque eu bem sei os pensamentos que tenho sobre vós, diz o Senhor.',
    simplifiedPronunciation: 'Fór ai nô dâ tóts dét ai tink tô-uárd iú, sét dâ lórd',
    category: 'Purpose',
    keywords: ['know', 'thoughts', 'think']
  },
  {
    id: '1cor-15-57',
    reference: '1 Corinthians 15:57',
    text: 'But thanks be to God, which giveth us the victory through our Lord Jesus Christ.',
    translation: 'Mas graças a Deus que nos dá a vitória por nosso Senhor Jesus Cristo.',
    simplifiedPronunciation: 'Bát ténks bi tu gód, uitch guí-vét ás dâ víc-tô-ri tru áu-êr lórd djí-zâs craist',
    category: 'Victory',
    keywords: ['thanks', 'victory', 'through']
  }
];
