<?php
require_once("simple_entry.php");
require_once("database.php");

final class ManeuverDAL {

	private function __construct() {}

	/**
	 * Loads a maneuver with a specific ID from the database.
	 * @return An instance of an maneuver or NULL.
	 */
	public static function loadById($maneuverId){
		$maneuver = NULL;
		$db = DBConnector::getConnection();

		$sql = sprintf("SELECT id, name FROM maneuver WHERE id='%s",
            $maneuverId);

		$db->querySelect($sql);

		$row = $db->getNextRow();
		
		if ($row) {
			$maneuver = new SimpleEntry($row);
		}
		
		$db->close();
		return $maneuver;
	}

	/**
	 * Loads all maneuvers from the database.
	 * @return An array of maneuvers.
	 */
	public static function loadAll() {
		$maneuvers = array();

		$db = DBConnector::getConnection();
		$db->querySelect("SELECT id, name FROM maneuver");

		while (TRUE) {
			$row = $db->getNextRow();

			if ($row == FALSE)
				break;

			$maneuver = new SimpleEntry($row);
			if ($maneuver->isValid()) {
				array_push($maneuvers, $maneuver);
			}
		}

		$db->close();
		return $maneuvers;
	}
}

?>