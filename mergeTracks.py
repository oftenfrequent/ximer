#!/usr/bin/python
import os
import glob
import sys
from pydub import AudioSegment


for folder in [ 'tmp/' + x for x in sys.argv[1:] ]:
	track = AudioSegment.from_file(folder+'/0.wav',format="wav");
	for file in [ folder + '/' + str(x) + '.wav' for x in range(1,34)]:
 		track += AudioSegment.from_file(file, format="wav")
 	track.export(folder + ".wav", format="wav")



final = AudioSegment.from_file('tmp/'+sys.argv[1]+'.wav', format="wav");

for wav in [ 'tmp/' + x + '.wav' for x in sys.argv[2:] ]:
	final = final.overlay(AudioSegment.from_file(wav, format="wav"));
final.export('final.wav', format='wav')




