package de.htwg.seapal.database.impl;

import com.google.inject.Inject;
import com.google.inject.name.Named;
import de.htwg.seapal.Constants;
import de.htwg.seapal.database.IBoatDatabase;
import de.htwg.seapal.model.IBoat;
import de.htwg.seapal.model.impl.Boat;
import de.htwg.seapal.utils.logging.ILogger;
import org.ektorp.CouchDbConnector;
import org.ektorp.ViewQuery;
import org.ektorp.support.CouchDbRepositorySupport;

import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

public class BoatDatabase
        extends CouchDbRepositorySupport<Boat>
        implements IBoatDatabase {

    private final ILogger logger;

    @Inject
    protected BoatDatabase(@Named("boatCouchDbConnector") CouchDbConnector db, ILogger logger) {
        super(Boat.class, db, true);
        super.initStandardDesignDocument();
        this.logger = logger;
    }

    @Override
    public boolean open() {
        logger.info("BoatDatabase", "Database connection opened");
        return true;
    }

    @Override
    public UUID create() {
        return null;
    }

    @Override
    public boolean save(IBoat data) {
        Boat entity = (Boat) data;

        if (entity.isNew()) {
            // ensure that the id is generated and revision is null for saving a new entity
            entity.setId(UUID.randomUUID().toString());
            entity.setRevision(null);
            add(entity);
            return true;
        }

        update(entity);
        return false;
    }

    @Override
    public IBoat get(UUID id) {
        return get(id.toString());
    }

    @Override
    public List<IBoat> loadAll() {
        List<IBoat> boats = new LinkedList<IBoat>(getAll());
        logger.info("BoatDatabase", "Loaded entities. Count: " + boats.size());
        return boats;
    }

    @Override
    public void delete(UUID id) {
        logger.info("BoatDatabase", "Removing entity with UUID: " + id.toString());
        remove((Boat) get(id));
    }

    @Override
    public boolean close() {
        return true;
    }
    @Override
    public List<? extends IBoat> queryViews(final String viewName, final String key) {
        return super.queryView(viewName, key);
    }

    @Override
    public List<Boat> getBoats(String userid, String viewId) {
        ViewQuery query = new ViewQuery().designDocId(Constants.DESIGN_DOCUMENT).viewName(viewId).key(userid);

        return db.queryView(query, Boat.class);
    }
}
