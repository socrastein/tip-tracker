import { Tip } from "../scripts/ClassTip";

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function generateRandomTip() {
    return getRandomInRange(100, 700);
}

