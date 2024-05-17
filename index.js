// Transformation du message texte en message binaire
function transformStringToBinary(message) {
  return message
    .split("")
    .map((char) => {
      let binary = char.charCodeAt(0).toString(2);
      return binary.padStart(8, "0");
    })
    .join("");
}

// Division du message en bloc de 16 bits
function diviseInBloc(message) {
  let blocs = [];
  while (message.length > 0) {
    let currentBloc = message.slice(0, 16);
    blocs.push(currentBloc);
    message = message.substr(16);
  }
  return blocs;
}

// Fonction d'expansion: passage d'un bloc de 8 à un bloc de 12
function expansionFunction(bloc, expansionArray) {
  let blocResult = "";
  for (let blocNumber of expansionArray) {
    blocResult += bloc[blocNumber - 1];
  }
  return blocResult;
}

// Fonction de xor entre 2 blocs de même taille
function xorFunction(firstBloc, secondBloc) {
  let xorResult = "";
  for (let i = 0; i < firstBloc.length; i++) {
    xorResult += firstBloc[i] == secondBloc[i] ? "0" : "1";
  }
  return xorResult;
}

// Fonction qui ajoute des O en tête du code binaire pour obtenir un binaire de 4 bits
function addZeroForBinary(binary) {
  while (binary.length < 4) {
    binary = "0" + binary;
  }
  return binary;
}

// Fonction qui permet de récupérer un bloc de 4 bits en utilisant une s-box
function sBox(bloc, sbox) {
  // On récupère le premier et dernier bit du bloc pour obtenir le numéro de la ligne en les transformant en nombres décimaux
  let row = bloc[0] + bloc[bloc.length - 1];
  let rowIndex = parseInt(row, 2);
  //   On récupère les 4 bits interne du bloc pour obtenir le numéro de la colonne en les transformant en nombres décimaux
  let col = bloc.slice(2, 6);
  let colIndex = parseInt(col, 2);
  //   Avec les index ligne et colonne, on récupére le nombre décimal qui correspond dans la s-box et on le transforme en nombre binaire en s'assurant qu'il fait 4 bits
  let binary = sbox[rowIndex][colIndex].toString(2);
  return addZeroForBinary(binary);
}

// Fonction de SBox: d'un bloc de 12, on sépare en 2 puis sur chaque bloc on applique la fonction sBox avec la s-box correpondant puis on assemble les 2 blocs créés
// Sortie de la fonction: un bloc de 8
function sBoxFunction(bloc, firstSBox, secondSBox) {
  let firstVector = bloc.slice(0, bloc.length / 2);
  let secondVector = bloc.slice(bloc.length / 2);
  let sBoxResult =
    sBox(firstVector, firstSBox).toString() +
    sBox(secondVector, secondSBox).toString();
  return sBoxResult;
}

// Fonction de permutation: on change de place les bits du bloc en fonction de la table de permutation passée en paramètre
function permutationFunction(bloc, permutationKey) {
  let blocResult = "";
  for (let i = 0; i < bloc.length; i++) {
    blocResult += bloc[permutationKey[i] - 1];
  }
  return blocResult;
}

// Fonction de transformation des blocs: sur un bloc, on le sépare en 2 puis sur le bloc droit, on applique les fonctions suivantes:
// - expansion avec la table d'expansion passée en paramètre
// - xor entre le nouveau bloc obtenu et la clé de l'itération passée en paramètre
// - s-box: passage de 2 blocs de 6 bits à 1 bloc de 8 bits
// - permutation: changement de place des bits en fonction de la table de permutation passée en paramètre
// - xor entre le nouveau bloc droit obtenu et le bloc gauche -> le résultat du xor devient le prochain bloc droit
// - le bloc droit d'origine devient le bloc gauche de la prochaine itération
function feistelFunction(
  bloc,
  key,
  expansion,
  firstSBox,
  secondSBox,
  permutation
) {
  let left = bloc.slice(0, bloc.length / 2);
  let right = bloc.slice(bloc.length / 2);
  let futurLeft = right;
  right = expansionFunction(right, expansion);
  right = xorFunction(right, key);
  right = sBoxFunction(right, firstSBox, secondSBox);
  right = permutationFunction(right, permutation);
  right = xorFunction(right, left);
  left = futurLeft;
  return left + right;
}

// Fonction pour décaler les bits en fonction du décalage (pour la génération des clés)
function shiftKey(key, decalage) {
  let nextKey = "";
  for (let i = 0; i < key.length; i++) {
    nextKey +=
      i + decalage < key.length
        ? key[i + decalage]
        : key[i + decalage - key.length];
  }
  return nextKey;
}

// Fonction de génération des clés pour l'itération en cours -> currentKey et la clé qui servira à la génération de la prochaine clé -> nextKey
function keyGeneration(previousKey, round) {
  let leftKey = previousKey.slice(0, previousKey.length / 2);
  let rightKey = previousKey.slice(previousKey.length / 2);
  // Calcul du décalage en fonction de l'itération
  let decalageNumber = [1, 2, 9, 16].includes(round) ? 1 : 2;
  let nextKey =
    shiftKey(leftKey, decalageNumber) + shiftKey(rightKey, decalageNumber);
  currentKey = permutationFunction(nextKey, permutedChoiceForKey);
  return { nextKey, currentKey };
}

// Fonction mini-DES avec les étapes suivantes:
// - transformation du text en binaire
// - division du binaire obtenu en bloc de 16 bits
// - pour chaque bloc, on fait 16 fois la fonction feistelFunction avec une clé générée à chaque itération par la fonction keyGeneration
// A la fin de ces 16 itérations, on rassemble les blocs pour faire un seul message en binaire
function desFunction(
  text,
  firstKey,
  expansionTable,
  permutationTable,
  firstSBox,
  secondSBox
) {
  let binaryText = transformStringToBinary(text);
  let blocs = diviseInBloc(binaryText);
  // Pour chaque bloc, on applique la fonction suivant le schéma de Feistel 16 fois
  let cryptedMessage = "";
  for (let bloc of blocs) {
    let currentKeyForRound;
    let currentKeyForNextKeyGeneration = firstKey;
    for (let i = 0; i < 16; i++) {
      const result = keyGeneration(currentKeyForNextKeyGeneration, i);
      currentKeyForRound = result.currentKey;
      currentKeyForNextKeyGeneration = result.nextKey;
      bloc = feistelFunction(
        bloc,
        currentKeyForRound,
        expansionTable,
        firstSBox,
        secondSBox,
        permutationTable
      );
    }
    cryptedMessage += bloc;
  }
  return cryptedMessage;
}

// Données d'entrée pour le mini-DES
let text = "voici un message de test";
const firstKey = "100101101101";
const permutedChoiceForKey = [8, 7, 1, 4, 10, 5, 3, 9, 2, 12, 6, 11];
const expansionTable = [8, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 1];
const permutationTable = [2, 8, 4, 7, 6, 5, 3, 1];
const sBoxForFirstVector = [
  [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
  [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
  [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
  [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
];
const sBoxForSecondVector = [
  [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10],
  [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5],
  [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15],
  [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
];

// appel à la fonction DES et affichage du résultat
const crytedMessage = desFunction(
  "coucou les amis",
  firstKey,
  expansionTable,
  permutationTable,
  sBoxForFirstVector,
  sBoxForSecondVector
);
console.log(crytedMessage);
