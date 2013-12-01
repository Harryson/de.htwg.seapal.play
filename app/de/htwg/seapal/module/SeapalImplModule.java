package de.htwg.seapal.module;

import de.htwg.seapal.database.impl.*;
import de.htwg.seapal.database.impl.AccountDatabase;
import de.htwg.seapal.database.IAccountDatabase;
import org.ektorp.CouchDbConnector;
import org.ektorp.CouchDbInstance;
import org.ektorp.impl.StdCouchDbConnector;

import com.google.inject.Provides;
import com.google.inject.name.Named;
import com.google.inject.name.Names;

import de.htwg.seapal.database.IBoatDatabase;
import de.htwg.seapal.database.IMarkDatabase;
import de.htwg.seapal.database.IPersonDatabase;
import de.htwg.seapal.database.IRaceDatabase;
import de.htwg.seapal.database.IRouteDatabase;
import de.htwg.seapal.database.ITripDatabase;
import de.htwg.seapal.database.IWaypointDatabase;
import de.htwg.seapal.utils.logger.iml.WebLogger;
import de.htwg.seapal.utils.logging.ILogger;

public class SeapalImplModule extends SeapalBaseModule {

	@Override
	protected void configure() {
		super.configure();

		// configure logger
		bind(ILogger.class).to(WebLogger.class);

		configureDatabases();
	}

	private void configureDatabases() {
        bind(String.class).annotatedWith(Names.named("databaseOfAccount")).toInstance("seapal_account_db");
        bind(IAccountDatabase.class).to(AccountDatabase.class);
        bind(String.class).annotatedWith(Names.named("databaseOfPerson")).toInstance("seapal_person_db");
		bind(IPersonDatabase.class).to(PersonDatabase.class);
		bind(String.class).annotatedWith(Names.named("databaseOfBoat")).toInstance("seapal_boats_db");
		bind(IBoatDatabase.class).to(BoatDatabase.class);
		bind(String.class).annotatedWith(Names.named("databaseOfTrip")).toInstance("seapal_trips_db");
		bind(ITripDatabase.class).to(TripDatabase.class);
		bind(String.class).annotatedWith(Names.named("databaseOfWaypoint")).toInstance("seapal_waypoint_db");
		bind(IWaypointDatabase.class).to(WaypointDatabase.class);
		bind(String.class).annotatedWith(Names.named("databaseOfRoute")).toInstance("seapal_route_db");
		bind(IRouteDatabase.class).to(RouteDatabase.class);
		bind(String.class).annotatedWith(Names.named("databaseOfMark")).toInstance("seapal_mark_db");
		bind(IMarkDatabase.class).to(MarkDatabase.class);
		bind(String.class).annotatedWith(Names.named("databaseOfRace")).toInstance("seapal_race_db");
		bind(IRaceDatabase.class).to(RaceDatabase.class);
	}

    @Provides
    @Named("accountCouchDbConnector")
    CouchDbConnector getAccountStdCouchDbConnector(@Named("databaseOfAccount") String databaseName, CouchDbInstance couchDbInstance) {
        return new StdCouchDbConnector(databaseName, couchDbInstance);
    }

    @Provides
	@Named("personCouchDbConnector")
	CouchDbConnector getPersonStdCouchDbConnector(@Named("databaseOfPerson") String databaseName, CouchDbInstance couchDbInstance) {
		return new StdCouchDbConnector(databaseName, couchDbInstance);
	}

	@Provides
	@Named("boatCouchDbConnector")
	CouchDbConnector getBoatStdCouchDbConnector(@Named("databaseOfBoat") String databaseName, CouchDbInstance couchDbInstance) {
		return new StdCouchDbConnector(databaseName, couchDbInstance);
	}

	@Provides
	@Named("tripCouchDbConnector")
	CouchDbConnector getTripStdCouchDbConnector(@Named("databaseOfTrip") String databaseName, CouchDbInstance couchDbInstance) {
		return new StdCouchDbConnector(databaseName, couchDbInstance);
	}

	@Provides
	@Named("waypointCouchDbConnector")
	CouchDbConnector getWaypointStdCouchDbConnector(@Named("databaseOfWaypoint") String databaseName, CouchDbInstance couchDbInstance) {
		return new StdCouchDbConnector(databaseName, couchDbInstance);
	}

	@Provides
	@Named("routeCouchDbConnector")
	CouchDbConnector getRouteStdCouchDbConnector(@Named("databaseOfRoute") String databaseName, CouchDbInstance couchDbInstance) {
		return new StdCouchDbConnector(databaseName, couchDbInstance);
	}

	@Provides
	@Named("markCouchDbConnector")
	CouchDbConnector getMarkStdCouchDbConnector(@Named("databaseOfMark") String databaseName, CouchDbInstance couchDbInstance) {
		return new StdCouchDbConnector(databaseName, couchDbInstance);
	}

	@Provides
	@Named("raceCouchDbConnector")
	CouchDbConnector getRaceStdCouchDbConnector(@Named("databaseOfRace") String databaseName, CouchDbInstance couchDbInstance) {
		return new StdCouchDbConnector(databaseName, couchDbInstance);
	}
}
