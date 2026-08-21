const express = require("express");
const {
  getPeople,
  createPerson,
  getPersonById,
  updatePerson,
  deletePerson,
} = require("../controllers/peopleController");

const router = express.Router();

router.get("/", getPeople);
router.post("/", createPerson);
router.get("/:id", getPersonById);
router.put("/:id", updatePerson);
router.delete("/:id", deletePerson);

module.exports = router;
