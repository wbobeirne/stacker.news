import { AuthenticationError } from 'apollo-server-micro'
import { decodeCursor, LIMIT, nextCursorEncoded } from '../../lib/cursor'
import { getItem } from './item'

export default {
  Query: {
    notifications: async (parent, { cursor }, { me, models }) => {
      const decodedCursor = decodeCursor(cursor)
      if (!me) {
        throw new AuthenticationError('you must be logged in')
      }

      /*
        So that we can cursor over results, we union notifications together ...
        this requires we have the same number of columns in all results

        select "Item".id, NULL as earnedSats, "Item".created_at as created_at from
        "Item" JOIN "Item" p ON "Item"."parentId" = p.id AND p."userId" = 622 AND
        "Item"."userId" <> 622 UNION ALL select "Item".id, "Vote".sats as earnedSats,
        "Vote".created_at as created_at FROM "Item" LEFT JOIN "Vote" on
        "Vote"."itemId" = "Item".id AND "Vote"."userId" <> 622 AND "Vote".boost = false
        WHERE "Item"."userId" = 622 ORDER BY created_at DESC;

        Because we want to "collapse" time adjacent votes in the result

        select vote.id, sum(vote."earnedSats") as "earnedSats", max(vote.voted_at)
        as "createdAt" from (select "Item".*, "Vote".sats as "earnedSats",
        "Vote".created_at as voted_at, ROW_NUMBER() OVER(ORDER BY "Vote".created_at) -
        ROW_NUMBER() OVER(PARTITION BY "Item".id ORDER BY "Vote".created_at) as island
        FROM "Item" LEFT JOIN "Vote" on "Vote"."itemId" = "Item".id AND
        "Vote"."userId" <> 622 AND "Vote".boost = false WHERE "Item"."userId" = 622)
        as vote group by vote.id, vote.island order by max(vote.voted_at) desc;

        We can also "collapse" votes occuring within 1 hour intervals of each other
        (I haven't yet combined with the above collapsing method .. but might be
        overkill)

        select "Item".id, sum("Vote".sats) as earnedSats, max("Vote".created_at)
        as created_at, ROW_NUMBER() OVER(ORDER BY max("Vote".created_at)) - ROW_NUMBER()
        OVER(PARTITION BY "Item".id ORDER BY max("Vote".created_at)) as island FROM
        "Item" LEFT JOIN "Vote" on "Vote"."itemId" = "Item".id AND "Vote"."userId" <> 622
        AND "Vote".boost = false WHERE "Item"."userId" = 622 group by "Item".id,
        date_trunc('hour', "Vote".created_at) order by created_at desc;

        island approach we used to take
        (SELECT ${ITEM_SUBQUERY_FIELDS}, max(subquery.voted_at) as "sortTime",
          sum(subquery.sats) as "earnedSats", false as mention
          FROM
          (SELECT ${ITEM_FIELDS}, "ItemAct".created_at as voted_at, "ItemAct".sats,
            ROW_NUMBER() OVER(ORDER BY "ItemAct".created_at) -
            ROW_NUMBER() OVER(PARTITION BY "Item".id ORDER BY "ItemAct".created_at) as island
            FROM "ItemAct"
            JOIN "Item" on "ItemAct"."itemId" = "Item".id
            WHERE "ItemAct"."userId" <> $1
            AND "ItemAct".created_at <= $2
            AND "ItemAct".act <> 'BOOST'
            AND "Item"."userId" = $1) subquery
          GROUP BY ${ITEM_SUBQUERY_FIELDS}, subquery.island
          ORDER BY max(subquery.voted_at) desc
          LIMIT ${LIMIT}+$3)
      */

      // HACK to make notifications faster, we only return a limited sub set of the unioned
      // queries ... we only ever need at most LIMIT+current offset in the child queries to
      // have enough items to return in the union
      const notifications = await models.$queryRaw(`
        (SELECT "Item".id::TEXT, "Item".created_at AS "sortTime", NULL as "earnedSats",
          'Reply' AS type
          FROM "Item"
          JOIN "Item" p ON "Item"."parentId" = p.id
          WHERE p."userId" = $1
            AND "Item"."userId" <> $1 AND "Item".created_at <= $2
          ORDER BY "Item".created_at DESC
          LIMIT ${LIMIT}+$3)
        UNION ALL
        (SELECT "Item".id::TEXT, MAX("ItemAct".created_at) AS "sortTime",
          sum("ItemAct".sats) as "earnedSats", 'Votification' AS type
          FROM "Item"
          JOIN "ItemAct" ON "ItemAct"."itemId" = "Item".id
          WHERE "ItemAct"."userId" <> $1
          AND "ItemAct".created_at <= $2
          AND "ItemAct".act <> 'BOOST'
          AND "Item"."userId" = $1
          GROUP BY ${ITEM_GROUP_FIELDS}
          ORDER BY MAX("ItemAct".created_at) DESC
          LIMIT ${LIMIT}+$3)
        UNION ALL
        (SELECT "Item".id::TEXT, "Mention".created_at AS "sortTime", NULL as "earnedSats",
          'Mention' AS type
          FROM "Mention"
          JOIN "Item" ON "Mention"."itemId" = "Item".id
          LEFT JOIN "Item" p ON "Item"."parentId" = p.id
          WHERE "Mention"."userId" = $1
          AND "Mention".created_at <= $2
          AND "Item"."userId" <> $1
          AND (p."userId" IS NULL OR p."userId" <> $1)
          ORDER BY "Mention".created_at DESC
          LIMIT ${LIMIT}+$3)
        UNION ALL
        (SELECT "Invite".id, MAX(users.created_at) AS "sortTime", NULL as "earnedSats",
          'Invitification' AS type
          FROM users JOIN "Invite" on users."inviteId" = "Invite".id
          WHERE "Invite"."userId" = $1
          AND users.created_at <= $2
          GROUP BY "Invite".id)
        ORDER BY "sortTime" DESC
        OFFSET $3
        LIMIT ${LIMIT}`, me.id, decodedCursor.time, decodedCursor.offset)

      const { checkedNotesAt } = await models.user.findUnique({ where: { id: me.id } })
      if (decodedCursor.offset === 0) {
        await models.user.update({ where: { id: me.id }, data: { checkedNotesAt: new Date() } })
      }

      return {
        lastChecked: checkedNotesAt,
        cursor: notifications.length === LIMIT ? nextCursorEncoded(decodedCursor) : null,
        notifications
      }
    }
  },
  Notification: {
    __resolveType: async (n, args, { models }) => n.type
  },
  Votification: {
    item: async (n, args, { models }) => getItem(n, { id: n.id }, { models })
  },
  Reply: {
    item: async (n, args, { models }) => getItem(n, { id: n.id }, { models })
  },
  Mention: {
    mention: async (n, args, { models }) => true,
    item: async (n, args, { models }) => getItem(n, { id: n.id }, { models })
  },
  Invitification: {
    invite: async (n, args, { models }) => {
      return await models.invite.findUnique({
        where: {
          id: n.id
        }
      })
    }
  }
}

// const ITEM_SUBQUERY_FIELDS =
//   `subquery.id, subquery."createdAt", subquery."updatedAt", subquery.title, subquery.text,
//   subquery.url, subquery."userId", subquery."parentId", subquery.path`

const ITEM_GROUP_FIELDS =
  `"Item".id, "Item".created_at, "Item".updated_at, "Item".title,
  "Item".text, "Item".url, "Item"."userId", "Item"."parentId", ltree2text("Item"."path")`

// const ITEM_FIELDS =
//   `"Item".id, "Item".created_at as "createdAt", "Item".updated_at as "updatedAt", "Item".title,
//   "Item".text, "Item".url, "Item"."userId", "Item"."parentId", ltree2text("Item"."path") AS path`
