#!/usr/bin/python
import soundcloud
import sys
import urllib2


client = soundcloud.Client(access_token=sys.argv[1])

track = client.post('/tracks', track={
    'title': sys.argv[3],
    'sharing': 'private',
    'asset_data': urllib2.urlopen(sys.argv[2])
})

print 'doneski'